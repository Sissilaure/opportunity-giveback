// Publication automatique des fiches trouvées par l'IA : DÉSACTIVÉE par défaut.
// Tant que la qualité des fiches n'a pas été vue par l'équipe, l'IA prépare (lecture de la source, image, résumé) et une
// personne publie. Pour passer en automatique : AUTO_PUBLISH=true (variable d'environnement du serveur).
const autoPublier = () => process.env.AUTO_PUBLISH === "true";

module.exports = { autoPublier };
