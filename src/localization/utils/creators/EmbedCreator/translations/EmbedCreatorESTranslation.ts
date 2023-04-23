import { Translation } from "@alice-localization/base/Translation";
import { chatInputApplicationCommandMention } from "discord.js";
import { EmbedCreatorStrings } from "../EmbedCreatorLocalization";

/**
 * The Spanish translation for the `EmbedCreator` creator utility.
 */
export class EmbedCreatorESTranslation extends Translation<EmbedCreatorStrings> {
    override readonly translations: EmbedCreatorStrings = {
        beatmapObjects: "",
        beatmapDroidStatistics: "",
        beatmapOsuStatistics: "",
        beatmapGeneralStatistics: "",
        exitMenu: 'Escribe "exit" para salir de este menú',
        result: "Resultado",
        droidPP: "Droid pp",
        pcPP: "PC pp",
        estimated: "aproximado",
        droidStars: "droid stars",
        pcStars: "PC stars",
        starRating: "Estrellas",
        rebalanceCalculationNote: "Los resultados podrian variar.",
        oldCalculationNote: "",
        beatmapInfo: "Información del mapa",
        dateAchieved: "Conseguido el %s",
        penalties: "",
        threeFinger: "",
        sliderCheese: "",
        forFC: "con %s FC",
        sliderTicks: "slider ticks",
        sliderEnds: "slider ends",
        hitErrorAvg: "promedio de error",
        challengeId: "ID de desafio",
        timeLeft: "Tiempo restante",
        weeklyChallengeTitle: "Desafio semanal de osu!droid",
        dailyChallengeTitle: "Desafio diario de osu!droid",
        featuredPerson: "Auspiciado por %s",
        download: "Descarga",
        points: "Puntos",
        passCondition: "Condición a cumplir",
        constrain: "Requisitos",
        modOnly: "Solo %s mod",
        rankableMods: "Cualquier mod rankeable menos EZ, NF ni HT",
        challengeBonuses: `Usa ${chatInputApplicationCommandMention(
            "daily",
            "bonuses",
            "1075209201049153617"
        )} para revisar los bonus.`,
        auctionInfo: "Información de la subasta",
        auctionName: "Nombre",
        auctionAuctioneer: "Subastador",
        creationDate: "Fecha de creación",
        auctionMinimumBid: "Monto mínimo para puja",
        auctionItemInfo: "Información del objeto",
        auctionPowerup: "Poder",
        auctionItemAmount: "Cantidad",
        auctionBidInfo: "Información de la puja",
        auctionBidders: "Pujadores",
        auctionTopBidders: "Top Pujas",
        reportBroadcast: "Transmisión",
        reportBroadcast1: `Si tu ves a algún usuario violando las reglas, con mal comportamiento, o siendo molesto de manera malintencionada, por favor reportarlo usando el comando ${chatInputApplicationCommandMention(
            "report",
            "1075209098997542986"
        )}.`,
        reportBroadcast2:
            "Ten en cuenta que solo miembros del staff pueden ver los reportes, por ende tu privacidad esta a salvo. Apreciamos la ayuda realizada para mantener este lugar con un ambiente amigable!",
        mapShareSubmission: "Registrado por %s",
        mapShareStatusAndSummary: "Estado y Resumen",
        mapShareStatus: "Estado",
        mapShareSummary: "Resumen",
        mapShareStatusAccepted: "aceptado",
        mapShareStatusDenied: "rechazado",
        mapShareStatusPending: "pendiente",
        mapShareStatusPosted: "publicado",
        musicYoutubeChannel: "Canal",
        musicDuration: "Duración",
        musicQueuer: "Solicitado por %s",
        ppProfileTitle: "Perfil de PP de %s",
        totalPP: "PP total",
        ppProfile: "Perfil de Rendimiento (PP)",
        oldPpProfileTitle: "",
        warningInfo: "",
        warnedUser: "",
        warningId: "",
        warningIssuedBy: "",
        expirationDate: "Fecha de Vencimiento",
        reason: "Razon",
        channel: "Canal",
        recommendedStarRating: "",
        none: "",
    };
}
