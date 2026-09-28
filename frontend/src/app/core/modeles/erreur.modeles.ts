// Format d'erreur réel du backend (exception/ErrorResponse.java) :
// { "statut": number, "message": string, "timestamp": string }
// Les erreurs de validation ajoutent un objet « erreurs » par champ.

export interface ErreurApi {
  statut: number;
  message: string;
  timestamp: string;
  erreurs?: Record<string, string>;
}
