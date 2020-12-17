import { Skill } from './Skill';
import { DifficultyHitObject } from '../../beatmap/hitobjects/DifficultyHitObject';

/**
 * Represents the skill required to correctly aim at every object in the map with a uniform CircleSize and normalized distances.
 */
export class Aim extends Skill {
    /**
     * Minimum timing threshold.
     */
    private readonly timingThreshold: number = 107;

    protected readonly angleBonusBegin: number = Math.PI / 3;
    protected readonly skillMultiplier: number = 26.25;
    protected readonly strainDecayBase: number = 0.15;

    /**
     * @param currentObject The hitobject to calculate.
     */
    strainValueOf(currentObject: DifficultyHitObject): number {
        if (!currentObject.strainTime) {
            return 0;
        }

        let result: number = 0;
        const scale: number = 90;

        function applyDiminishingExp(val: number): number {
            return Math.pow(val, 0.99);
        };

        if (this.previous.length > 0) {
            if (currentObject.angle !== null && currentObject.angle > 0 && currentObject.angle > this.angleBonusBegin) {
                const angleBonus: number = Math.sqrt(
                    Math.max(this.previous[0].jumpDistance - scale, 0) *
                    Math.pow(Math.sin(currentObject.angle - this.angleBonusBegin), 2) *
                    Math.max(currentObject.jumpDistance - scale, 0)
                );
                result = 1.5 * applyDiminishingExp(Math.max(0, angleBonus)) /
                    Math.max(this.timingThreshold, this.previous[0].strainTime);
            }
        }

        const jumpDistanceExp: number = applyDiminishingExp(currentObject.jumpDistance);
        const travelDistanceExp: number = applyDiminishingExp(currentObject.travelDistance);
        const weightedDistance: number = jumpDistanceExp + travelDistanceExp + Math.sqrt(travelDistanceExp * jumpDistanceExp);

        return Math.max(
            result + weightedDistance / Math.max(currentObject.strainTime, this.timingThreshold),
            weightedDistance / currentObject.strainTime
        );
    }

    /**
     * @param currentObject The hitobject to save to.
     */
    saveToHitObject(currentObject: DifficultyHitObject): void {
        currentObject.aimStrain = this.currentStrain;
    }
}