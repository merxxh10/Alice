import { Circle } from "../beatmap/hitobjects/Circle";
import { DifficultyHitObject } from "../beatmap/hitobjects/DifficultyHitObject";
import { Spinner } from "../beatmap/hitobjects/Spinner";
import { hitResult } from "../constants/hitResult";
import { modes } from "../constants/modes";
import { movementType } from "../constants/movementType";
import { StarRating } from "../difficulty/StarRating";
import { Vector2 } from "../mathutil/Vector2";
import { DroidHitWindow } from "../utils/HitWindow";
import { MapStats } from "../utils/MapStats";
import { mods } from "../utils/mods";
import { CursorData } from "./data/CursorData";
import { ReplayData } from "./data/ReplayData";
import { ReplayObjectData } from "./data/ReplayObjectData";

/**
 * Information about the result of a check.
 */
export interface ThreeFingerInformation {
    /**
     * Whether or not the beatmap is 3-fingered.
     */
    readonly is3Finger: boolean;

    /**
     * The final penalty. By default this is 1.
     */
    readonly penalty: number;
}

/**
 * Break points that have their start and end time set right on the
 * nearest object's start time (for beginning) and end time (for end).
 */
interface AccurateBreakPoint {
    /**
     * The start time of the break point.
     */
    readonly startTime: number;

    /**
     * The end time of the break point.
     */
    readonly endTime: number;
}

/**
 * Contains information about factors to nerf, which will be summed in the end.
 */
interface NerfFactor {
    /**
     * Nerf factor from the strain of the section.
     */
    readonly strainFactor: number;

    /**
     * Nerf factor based on the length of the strain.
     */
    readonly lengthFactor: number;

    /**
     * Nerf factor based on how much a section is 3-fingered.
     */
    readonly fingerFactor: number;
    
    /**
     * The amount of objects that were 3-fingered.
     */
    readonly objectCount: number;
}

/**
 * A section of a beatmap. This is used to detect dragged sections.
 */
interface BeatmapSection {
    /**
     * The index of the first `DifficultyHitObject` of this beatmap section.
     */
    readonly firstObjectIndex: number;

    /**
     * The index of the last `DifficultyHitObject` of this beatmap section.
     */
    readonly lastObjectIndex: number;

    /**
     * Whether or not this beatmap section is dragged.
     */
    isDragged: boolean;

    /**
     * The index of the cursor that is dragging this section.
     */
    dragFingerIndex: number;
}

export class ThreeFingerChecker {
    /**
     * The beatmap to analyze.
     */
    readonly map: StarRating;

    /**
     * The data of the replay.
     */
    readonly data: ReplayData;

    /**
     * The strain threshold to start detecting for 3-fingered section.
     * 
     * Increasing this number will result in less sections being flagged.
     */
    private readonly strainThreshold: number = 200;

    /**
     * The amount of notes that has a speed strain exceeding `strainThreshold`.
     */
    private readonly strainNoteCount: number;

    /**
     * The speed strain sum of all notes that exceed `strainThreshold`.
     */
    private readonly speedStrainSum: number;

    /**
     * The ratio threshold between non-3 finger cursors and 3-finger cursors.
     * 
     * Increasing this number will increase detection accuracy, however
     * it also increases the chance of falsely flagged plays.
     */
    private readonly threeFingerRatioThreshold: number = 0.01;

    /**
     * The maximum delta time allowed between two beatmap sections.
     * 
     * Increasing this number decreases the amount of beatmap sections in general.
     * 
     * Note that this value does not account for the speed multiplier of
     * the play, similar to the way replay object data is stored.
     */
    private readonly maxSectionDeltaTime: number = 2000;

    /**
     * The minimum object count required to make a beatmap section.
     * 
     * Increasing this number decreases the amount of beatmap sections.
     */
    private readonly minSectionObjectCount: number = 5;

    /**
     * The sections of the beatmap that was cut based on `maxSectionDeltaTime` and `minSectionObjectCount`.
     */
    private readonly beatmapSections: BeatmapSection[] = [];

    /**
     * This threshold is used to filter out accidental taps.
     * 
     * Increasing this number makes the filtration more sensitive, however it
     * will also increase the chance of 3-fingered plays getting out from
     * being flagged.
     */
    private readonly accidentalTapThreshold: number = 500;

    /**
     * The hit window of this beatmap. Keep in mind that speed-changing mods do not change hit window length in game logic.
     */
    private readonly hitWindow: DroidHitWindow;

    /**
     * A reprocessed break points to match right on object time.
     * 
     * This is used to increase detection accuracy since break points do not start right at the
     * start of the hitobject before it and do not end right at the first hitobject after it.
     */
    private readonly breakPointAccurateTimes: AccurateBreakPoint[] = [];

    /**
     * A cursor data array that only contains `movementType.DOWN` movement ID occurrences.
     */
    private readonly downCursorInstances: CursorData[] = [];

    /**
     * Nerf factors from all sections that were three-fingered.
     */
    private readonly nerfFactors: NerfFactor[] = [];

    /**
     * @param map The beatmap to analyze.
     * @param data The data of the replay.
     */
    constructor(map: StarRating, data: ReplayData) {
        this.map = map;
        this.data = data;

        const speedModRegex: RegExp = new RegExp(`[${mods.droidMods.dt}${mods.droidMods.nc}${mods.droidMods.ht}${mods.droidMods.su}]`, "g");
        const droidModNoSpeedMod: string = mods.pcToDroid(this.map.mods).replace(speedModRegex, "");
        const stats: MapStats = new MapStats({od: this.map.map.od, mods: mods.droidToPC(droidModNoSpeedMod)}).calculate({mode: modes.droid});

        this.hitWindow = new DroidHitWindow(stats.od as number);

        const strainNotes: DifficultyHitObject[] = map.objects.filter(v => v.speedStrain >= this.strainThreshold);
        this.strainNoteCount = strainNotes.length;
        this.speedStrainSum = strainNotes.map(v => {return v.speedStrain;}).reduce((acc, value) => acc + value, 0);
    }

    /**
     * Checks if the given beatmap is 3-fingered and also returns the final penalty.
     * 
     * The beatmap will be separated into sections and each section will be determined
     * whether or not it is dragged.
     * 
     * After that, each section will be assigned a nerf factor based on whether or not
     * the section is 3-fingered. These nerf factors will be summed up into a final
     * nerf factor, taking beatmap difficulty into account.
     */
    check(): ThreeFingerInformation {
        if (this.strainNoteCount === 0) {
            return { is3Finger: false, penalty: 1 };
        }

        this.getAccurateBreakPoints();
        this.filterCursorInstances();

        if (this.downCursorInstances.filter(v => v.size > 0).length <= 3) {
            return { is3Finger: false, penalty: 1 };
        }

        this.getBeatmapSections();
        this.detectDragPlay();
        this.getDetailedBeatmapSections();
        this.preventAccidentalTaps();

        // Recheck if there are less than
        // or equal to 3 filled cursor instances.
        if (this.downCursorInstances.filter(v => v.size > 0).length <= 3) {
            return { is3Finger: false, penalty: 1 };
        }

        this.calculateNerfFactors();

        const finalPenalty: number = this.calculateFinalPenalty();

        return { is3Finger: finalPenalty > 1, penalty: finalPenalty };
    }

    /**
     * Gets the accurate break points.
     * 
     * This is done to increase detection accuracy since break points do not start right at the
     * start of the hitobject before it and do not end right at the first hitobject after it.
     */
    private getAccurateBreakPoints(): void {
        const objects: DifficultyHitObject[] = this.map.objects;
        const objectData: ReplayObjectData[] = this.data.hitObjectData;

        const isPrecise: boolean = this.map.mods.includes("PR");

        for (const breakPoint of this.map.map.breakPoints) {
            const beforeIndex: number = objects.findIndex(o => o.object.endTime > breakPoint.startTime) - 1;
            let timeBefore: number = objects[beforeIndex].object.endTime;

            // For sliders and spinners, automatically set hit window length to be as lenient as possible.
            let beforeIndexHitWindowLength: number = this.hitWindow.hitWindowFor50(isPrecise);
            switch (objectData[beforeIndex].result) {
                case hitResult.RESULT_300:
                    beforeIndexHitWindowLength = this.hitWindow.hitWindowFor300(isPrecise);
                    break;
                case hitResult.RESULT_100:
                    beforeIndexHitWindowLength = this.hitWindow.hitWindowFor100(isPrecise);
                    break;
                default:
                    beforeIndexHitWindowLength = this.hitWindow.hitWindowFor50(isPrecise);
            }

            timeBefore += beforeIndexHitWindowLength;

            const afterIndex: number = beforeIndex + 1;
            let timeAfter: number = objects[afterIndex].object.startTime;

            // For sliders and spinners, automatically set hit window length to be as lenient as possible.
            let afterIndexHitWindowLength: number = this.hitWindow.hitWindowFor50(isPrecise);
            switch (objectData[afterIndex].result) {
                case hitResult.RESULT_300:
                    afterIndexHitWindowLength = this.hitWindow.hitWindowFor300(isPrecise);
                    break;
                case hitResult.RESULT_100:
                    afterIndexHitWindowLength = this.hitWindow.hitWindowFor100(isPrecise);
                    break;
                default:
                    afterIndexHitWindowLength = this.hitWindow.hitWindowFor50(isPrecise);
            }

            timeAfter += afterIndexHitWindowLength;

            this.breakPointAccurateTimes.push({
                startTime: timeBefore,
                endTime: timeAfter
            });
        }
    }

    /**
     * Filters the original cursor instances, returning only those with `movementType.DOWN` movement ID.
     * 
     * This also filters cursors that are in break period or happen before start/after end of the beatmap.
     */
    private filterCursorInstances(): void {
        const objects: DifficultyHitObject[] = this.map.objects;
        const objectData: ReplayObjectData[] = this.data.hitObjectData;

        const firstObjectResult: hitResult = objectData[0].result;
        const lastObjectResult: hitResult = objectData[objectData.length - 1].result;

        const isPrecise: boolean = this.map.mods.includes("PR");

        // For sliders, automatically set hit window length to be as lenient as possible.
        let firstObjectHitWindow: number = this.hitWindow.hitWindowFor50(isPrecise);
        if (objects[0].object instanceof Circle) {
            switch (firstObjectResult) {
                case hitResult.RESULT_300:
                    firstObjectHitWindow = this.hitWindow.hitWindowFor300(isPrecise);
                    break;
                case hitResult.RESULT_100:
                    firstObjectHitWindow = this.hitWindow.hitWindowFor100(isPrecise);
                    break;
                default:
                    firstObjectHitWindow = this.hitWindow.hitWindowFor50(isPrecise);
            }
        }
        
        // For sliders, automatically set hit window length to be as lenient as possible.
        let lastObjectHitWindow: number = this.hitWindow.hitWindowFor50(isPrecise);
        if (objects[objects.length - 1].object instanceof Circle) {
            switch (lastObjectResult) {
                case hitResult.RESULT_300:
                    lastObjectHitWindow = this.hitWindow.hitWindowFor300(isPrecise);
                    break;
                case hitResult.RESULT_100:
                    lastObjectHitWindow = this.hitWindow.hitWindowFor100(isPrecise);
                    break;
                default:
                    lastObjectHitWindow = this.hitWindow.hitWindowFor50(isPrecise);
            }
        }

        // These hit time uses hit window length as threshold.
        // This is because cursors aren't recorded exactly at hit time,
        // probably due to the game's behavior.
        const firstObjectHitTime: number = objects[0].object.startTime - firstObjectHitWindow;
        const lastObjectHitTime: number = objects[objects.length - 1].object.startTime + lastObjectHitWindow;

        for (let i = 0; i < this.data.cursorMovement.length; ++i) {
            const cursorInstance: CursorData = this.data.cursorMovement[i];
            const newCursorData: CursorData = {
                size: 0,
                time: [],
                x: [],
                y: [],
                id: []
            };

            for (let j = 0; j < cursorInstance.size; ++j) {
                if (cursorInstance.id[j] !== movementType.DOWN) {
                    continue;
                }

                const time: number = cursorInstance.time[j];

                if (time < firstObjectHitTime || time > lastObjectHitTime) {
                    continue;
                }

                let inBreakPoint: boolean = false;
                for (const breakPoint of this.breakPointAccurateTimes) {
                    if (time >= breakPoint.startTime && time <= breakPoint.endTime) {
                        inBreakPoint = true;
                        break;
                    }
                }

                if (inBreakPoint) {
                    continue;
                }

                ++newCursorData.size;
                newCursorData.time.push(time);
                newCursorData.x.push(cursorInstance.x[j]);
                newCursorData.y.push(cursorInstance.y[j]);
                newCursorData.id.push(cursorInstance.id[j]);
            }

            this.downCursorInstances.push(newCursorData);
        }
    }

    /**
     * Divides the beatmap into sections, which will be used to
     * detect dragged sections and improve detection speed.
     */
    private getBeatmapSections(): void {
        let firstObjectIndex: number = 0;

        for (let i = 0; i < this.map.objects.length - 1; ++i) {
            const current: DifficultyHitObject = this.map.objects[i];
            const next: DifficultyHitObject = this.map.objects[i + 1];

            const realDeltaTime: number = next.object.startTime - current.object.endTime;

            if (realDeltaTime >= this.maxSectionDeltaTime) {
                // Ignore sections that don't meet object count requirement.
                if (i - firstObjectIndex < this.minSectionObjectCount) {
                    firstObjectIndex = i + 1;
                    continue;
                }

                this.beatmapSections.push({
                    firstObjectIndex,
                    lastObjectIndex: i,
                    isDragged: false,
                    dragFingerIndex: -1
                });

                firstObjectIndex = i + 1;
            }
        }

        // Don't forget to manually add the last beatmap section, which would otherwise be ignored.
        if (this.map.objects.length - firstObjectIndex > this.minSectionObjectCount) {
            this.beatmapSections.push({
                firstObjectIndex,
                lastObjectIndex: this.map.objects.length - 1,
                isDragged: false,
                dragFingerIndex: -1
            });
        }
    }

    /**
     * Checks whether or not each beatmap sections is dragged.
     */
    private detectDragPlay(): void {
        for (let i = 0; i < this.beatmapSections.length; ++i) {
            const dragIndex: number = this.checkDrag(this.beatmapSections[i]);

            this.beatmapSections[i].dragFingerIndex = dragIndex;
            this.beatmapSections[i].isDragged = dragIndex !== -1;
        }
    }
    
    /**
     * Checks if a section is dragged and returns the index of the drag finger.
     * 
     * If the section is not dragged, -1 will be returned.
     * 
     * @param section The section to check.
     */
    private checkDrag(section: BeatmapSection): number {
        const objects: DifficultyHitObject[] = this.map.objects;
        const objectData: ReplayObjectData[] = this.data.hitObjectData;
        const isPrecise: boolean = this.map.mods.includes("PR");

        const firstObject: DifficultyHitObject = objects[section.firstObjectIndex];
        const lastObject: DifficultyHitObject = objects[section.lastObjectIndex];

        let firstObjectMinHitTime: number = firstObject.object.startTime;
        if (firstObject.object instanceof Circle) {
            switch (objectData[section.firstObjectIndex].result) {
                case hitResult.RESULT_300:
                    firstObjectMinHitTime -= this.hitWindow.hitWindowFor300(isPrecise);
                    break;
                case hitResult.RESULT_100:
                    firstObjectMinHitTime -= this.hitWindow.hitWindowFor100(isPrecise);
                    break;
                default:
                    firstObjectMinHitTime -= this.hitWindow.hitWindowFor50(isPrecise);
            }
        } else {
            firstObjectMinHitTime -= this.hitWindow.hitWindowFor50(isPrecise);
        }

        let lastObjectMaxHitTime: number = lastObject.object.startTime;
        if (lastObject.object instanceof Circle) {
            switch (objectData[section.lastObjectIndex].result) {
                case hitResult.RESULT_300:
                    lastObjectMaxHitTime += this.hitWindow.hitWindowFor300(isPrecise);
                    break;
                case hitResult.RESULT_100:
                    lastObjectMaxHitTime += this.hitWindow.hitWindowFor100(isPrecise);
                    break;
                default:
                    lastObjectMaxHitTime += this.hitWindow.hitWindowFor50(isPrecise);
            }
        } else {
            lastObjectMaxHitTime += this.hitWindow.hitWindowFor50(isPrecise);
        }

        // Since there may be more than 1 cursor instance index, 
        // we check which cursor instance follows hitobjects all over.
        const cursorIndexes: number[] = [];
        for (let i = 0; i < this.data.cursorMovement.length; ++i) {
            const c: CursorData = this.data.cursorMovement[i];
            if (c.size === 0) {
                continue;
            }

            // Do not include cursors that don't have an occurence in this section
            // this speeds up checking process.
            if (c.time.filter(v => v >= firstObjectMinHitTime && v <= lastObjectMaxHitTime).length === 0) {
                continue;
            }

            // If this cursor instance doesn't move, it's not the cursor instance we want.
            if (c.id.filter(v => v === movementType.MOVE).length === 0) {
                continue;
            }

            cursorIndexes.push(i);
        }

        return this.findDragIndex(
            objects.slice(section.firstObjectIndex, section.lastObjectIndex + 1),
            objectData.slice(section.firstObjectIndex, section.lastObjectIndex + 1),
            cursorIndexes
        );
    }

    /**
     * Finds the drag index of the section.
     * 
     * @param sectionObjects The objects in the section.
     * @param sectionReplayObjectData The hitobject data of all objects in the section.
     * @param cursorIndexes The indexes of the cursor instance that has at least an occurrence in the section.
     */
    private findDragIndex(sectionObjects: DifficultyHitObject[], sectionReplayObjectData: ReplayObjectData[], cursorIndexes: number[]): number {
        let objectIndex: number = sectionObjects.findIndex((v, i) => !(v.object instanceof Spinner) && sectionReplayObjectData[i].result !== hitResult.RESULT_0);
        if (objectIndex === -1) {
            return -1;
        }
        
        while (cursorIndexes.length > 0) {
            if (objectIndex === sectionObjects.length) {
                break;
            }

            const o: DifficultyHitObject = sectionObjects[objectIndex];
            const s: ReplayObjectData = sectionReplayObjectData[objectIndex];
            ++objectIndex;
            
            if (s.result === hitResult.RESULT_0) {
                continue;
            }

            // Get the cursor instance that is closest to the object's hit time.
            for (let j = 0; j < cursorIndexes.length; ++j) {
                const c: CursorData = this.data.cursorMovement[cursorIndexes[j]];
            
                // Cursor instances aren't always recorded at all times,
                // therefore the game emulates the movement between
                // movementType.MOVE cursors.
                const hitTime: number = o.object.startTime + s.accuracy;
                const nextHitIndex: number = c.time.findIndex(v => v >= hitTime);
                const hitIndex: number = nextHitIndex - 1;
                if (hitIndex <= -1) {
                    cursorIndexes[j] = -1;
                    continue;
                }
                if (c.id[hitIndex] === movementType.UP) {
                    cursorIndexes[j] = -1;
                    continue;
                }

                let cursorPosition: Vector2 = new Vector2({
                    x: c.x[hitIndex],
                    y: c.y[hitIndex]
                });

                let isInObject: boolean = false;

                if (c.id[nextHitIndex] === movementType.MOVE || c.id[hitIndex] === movementType.MOVE) {
                    // Try to interpolate movement between two movementType.MOVE cursor every 1ms.
                    // This minimizes rounding error.
                    for (let mSecPassed = c.time[hitIndex]; mSecPassed <= c.time[nextHitIndex]; mSecPassed += 1) {
                        const t: number = (mSecPassed - c.time[nextHitIndex]) / (c.time[hitIndex] - c.time[nextHitIndex]);
                        cursorPosition.x = c.x[hitIndex] * t + c.x[nextHitIndex] * (1 - t);
                        cursorPosition.y = c.y[hitIndex] * t + c.y[nextHitIndex] * (1 - t);

                        if (o.object.stackedPosition.getDistance(cursorPosition) <= o.radius) {
                            isInObject = true;
                            break;
                        }
                    }
                } else {
                    isInObject = o.object.stackedPosition.getDistance(cursorPosition) <= o.radius;
                }
                if (!isInObject) {
                    cursorIndexes[j] = -1;
                }
            }
            cursorIndexes = cursorIndexes.filter(v => v !== -1);
        }

        return cursorIndexes.shift() ?? -1;
    }

    /**
     * Redivides the beatmap into sections.
     * 
     * The result will be used to detect for three-fingered
     * sections.
     */
    private getDetailedBeatmapSections(): void {
        const objects: DifficultyHitObject[] = this.map.objects;
        const newBeatmapSections: BeatmapSection[] = [];
        
        for (const beatmapSection of this.beatmapSections) {
            let inSpeedSection: boolean = false;
            let newFirstObjectIndex = beatmapSection.firstObjectIndex;

            for (let i = beatmapSection.firstObjectIndex; i <= beatmapSection.lastObjectIndex; ++i) {
                if (!inSpeedSection && objects[i].speedStrain >= this.strainThreshold) {
                    inSpeedSection = true;
                    newFirstObjectIndex = i;
                    continue;
                }

                if (inSpeedSection && objects[i].speedStrain < this.strainThreshold) {
                    inSpeedSection = false;
                    newBeatmapSections.push({
                        firstObjectIndex: newFirstObjectIndex,
                        lastObjectIndex: i,
                        isDragged: beatmapSection.isDragged,
                        dragFingerIndex: beatmapSection.dragFingerIndex
                    });
                }
            }

            // Don't forget to manually add the last beatmap section, which would otherwise be ignored.
            if (inSpeedSection) {
                newBeatmapSections.push({
                    firstObjectIndex: newFirstObjectIndex,
                    lastObjectIndex: beatmapSection.lastObjectIndex,
                    isDragged: beatmapSection.isDragged,
                    dragFingerIndex: beatmapSection.dragFingerIndex
                });
            }
        }

        this.beatmapSections.length = 0;
        this.beatmapSections.push(...newBeatmapSections);
    }

    /**
     * Attempts to prevent accidental taps from being flagged.
     * 
     * This detection will filter cursors that don't hit
     * any object in beatmap sections, thus eliminating any
     * unnecessary taps.
     */
    private preventAccidentalTaps(): void {
        let filledCursorAmount: number = this.downCursorInstances.filter(v => v.size > 0).length;
        if (filledCursorAmount <= 3) {
            return;
        }

        const objects: DifficultyHitObject[] = this.map.objects;
        const totalCursorAmount: number = this.downCursorInstances
            .map(v => {return v.size;})
            .reduce((acc, value) => acc + value, 0);

        for (let i = 0; i < this.downCursorInstances.length; ++i) {
            if (filledCursorAmount <= 3) {
                break;
            }
            const cursorInstance: CursorData = this.downCursorInstances[i];
            // Use an estimation for accidental tap threshold.
            if (cursorInstance.size > 0 && cursorInstance.size <= Math.ceil(objects.length / this.accidentalTapThreshold) && cursorInstance.size / totalCursorAmount < this.threeFingerRatioThreshold) {
                --filledCursorAmount;
                for (const property in cursorInstance) {
                    const prop = property as keyof CursorData;
                    if (Array.isArray(cursorInstance[prop])) {
                        (cursorInstance[prop] as number[]).length = 0;
                    } else {
                        (cursorInstance[prop] as number) = 0;
                    }
                }
            }
            this.downCursorInstances[i] = cursorInstance;
        }
    }

    /**
     * Creates nerf factors by scanning through objects.
     * 
     * This check will ignore all objects with speed strain below `strainThreshold`.
     */
    private calculateNerfFactors(): void {
        const objects: DifficultyHitObject[] = this.map.objects;
        const objectData: ReplayObjectData[] = this.data.hitObjectData;
        const isPrecise: boolean = this.data.convertedMods.includes("PR");

        // In here, we only filter cursor instances that are above the strain threshold
        // this minimalizes the amount of cursor instances to analyze.
        for (const beatmapSection of this.beatmapSections) {
            const dragIndex: number = beatmapSection.dragFingerIndex;

            const startTime: number = objects[beatmapSection.firstObjectIndex].object.startTime +
                (
                    objectData[beatmapSection.firstObjectIndex].result !== hitResult.RESULT_0 ?
                    objectData[beatmapSection.firstObjectIndex].accuracy : 
                    -this.hitWindow.hitWindowFor50(isPrecise)
                );

            const endTime: number = objects[beatmapSection.lastObjectIndex].object.endTime +
                (
                    objectData[beatmapSection.lastObjectIndex].result !== hitResult.RESULT_0 ?
                    objectData[beatmapSection.lastObjectIndex].accuracy :
                    this.hitWindow.hitWindowFor50(isPrecise)
                );

            // Filter cursor instances during section.
            this.downCursorInstances.forEach(c => {
                const i: number = c.time.findIndex(t => t >= startTime);
                if (i !== -1) {
                    c.size -= i;
                    c.time.splice(0, i);
                    c.x.splice(0, i);
                    c.y.splice(0, i);
                    c.id.splice(0, i);
                }
            });
            const cursorAmounts: number[] = [];
            for (let i = 0; i < this.downCursorInstances.length; ++i) {
                // Do not include drag cursor instance.
                if (i === dragIndex) {
                    continue;
                }
                const cursorData: CursorData = this.downCursorInstances[i];
                let amount = 0;
                for (let j: number = 0; j < cursorData.size; ++j) {
                    if (cursorData.time[j] >= startTime && cursorData.time[j] <= endTime) {
                        ++amount;
                    }
                }
                cursorAmounts.push(amount);
            }

            // This index will be used to detect if a section is 3-fingered.
            // If the section is dragged, the dragged instance will be ignored,
            // hence why the index is 1 less than nondragged section.
            const fingerSplitIndex: number = dragIndex !== -1 ? 2 : 3;

            // Divide >=4th (3rd for drag) cursor instances with 1st + 2nd (+ 3rd for nondrag)
            // to check if the section is 3-fingered.
            const threeFingerRatio: number =
                cursorAmounts.slice(fingerSplitIndex).reduce((acc, value) => acc + value, 0) /
                cursorAmounts.slice(0, fingerSplitIndex).reduce((acc, value) => acc + value, 0);

            if (threeFingerRatio > this.threeFingerRatioThreshold) {
                // Strain factor applies more penalty for high strain sections.
                const strainSum: number = objects
                    .slice(beatmapSection.firstObjectIndex, beatmapSection.lastObjectIndex + 1)
                    .map(v => {return v.speedStrain;})
                    .reduce((acc, value) => acc + value, 0);

                const strainFactor: number = 1 + Math.pow(strainSum / this.speedStrainSum, 1.2);

                // We can ignore the first 3 (2 for drag) filled cursor instances
                // since they are guaranteed not 3 finger.
                const threeFingerCursors: number[] = cursorAmounts.slice(fingerSplitIndex);

                // Finger factor applies more penalty if more fingers were used.
                const objectCount: number = beatmapSection.lastObjectIndex + 1 - beatmapSection.firstObjectIndex;
                const fingerFactor: number = threeFingerCursors.reduce((acc, value, index) =>
                    acc + (index + 1) * value * objectCount / 100,
                    1
                );

                // Length factor applies more penalty if there are more 3-fingered object.
                const lengthFactor: number = 1 + Math.pow(objectCount / this.strainNoteCount, 1.2);

                this.nerfFactors.push({
                    strainFactor,
                    fingerFactor,
                    lengthFactor,
                    objectCount
                });
            }
        }
    }

    /**
     * Calculates the final penalty.
     */
    private calculateFinalPenalty(): number {
        if (this.nerfFactors.length === 0) {
            return 1;
        }

        const aim: number = this.map.aim;
        const speed: number = this.map.speed;

        let semifinalNerfFactor: number = 1;
        this.nerfFactors.forEach(n => {
            semifinalNerfFactor += 0.1 * Math.pow(n.strainFactor * n.fingerFactor * n.lengthFactor, 1.1);
        });

        // Difficulty factor nerfs heavily speed-based maps.
        //
        // While difficulty calculation buffs heavily
        // speed-based maps, they tend to be mashed more.
        const difficultyFactor: number = Math.pow(speed / Math.pow(aim, 1.25), 0.2);

        // Three finger note factor nerfs based on how
        // many objects were 3-fingered in contrast of the amount
        // of notes that exceed strain threshold.
        //
        // Realistically, overall object count should never exceed strainNoteCount,
        // therefore further checking is unnecessary.
        const overallObjectCount: number = this.nerfFactors.map(n => {return n.objectCount;}).reduce((acc, value) => acc + value, 0);
        const threeFingerNoteFactor: number = 1 + Math.pow(overallObjectCount / this.strainNoteCount, 1.15);
        
        const finalNerfFactor: number = Math.pow(semifinalNerfFactor * difficultyFactor * threeFingerNoteFactor, 0.2);

        return Math.max(1, finalNerfFactor);
    }
}