import useTitre from "../hooks/useTitre";

export default function Confidentialite() {
  useTitre("Confidentialité");
  return (
    <main className="mx-auto max-w-2xl px-5 pb-14 pt-6 sm:px-8 sm:pt-10">
      <p className="text-xs font-bold uppercase tracking-widest text-accent-dark">Confidentialité</p>
      <h1 className="mt-1 font-display text-4xl tracking-tight text-ink">Vos données</h1>
      <p className="mt-2 text-base text-muted">
        Nous ne collectons que ce qui est nécessaire au service, et rien d'autre.
      </p>

      <div className="contenu-guide mt-6">
        <h2>Ce que nous enregistrons</h2>
        <ul>
          <li>
            <strong>Votre email</strong>, uniquement si vous vous inscrivez aux alertes opportunités, avec la
            fréquence choisie.
          </li>
          <li>
            <strong>Votre compte</strong>, si vous en créez un : email, prénom (facultatif), mot de passe chiffré (nous ne le
            connaissons jamais) et la liste des opportunités que vous suivez, avec l'avancée de vos candidatures.
          </li>
          <li>
            <strong>Le texte de vos questions</strong> envoyées à l'équipe. N'y mettez pas d'informations
            personnelles : une fois répondues, elles peuvent apparaître dans la FAQ de la communauté.
          </li>
        </ul>

        <h2>Ce que nous ne faisons pas</h2>
        <ul>
          <li>Aucun compte n'est nécessaire pour consulter les opportunités et les ressources : il sert seulement au suivi et aux rappels.</li>
          <li>Aucune donnée n'est vendue ni transmise à des tiers.</li>
        </ul>

        <h2>Cookies et suivi</h2>
        <p>
          Nous n'utilisons aucun cookie publicitaire ni outil de statistiques. Seul un cookie technique de session est posé
          quand vous vous connectez à votre compte : il vous garde connecté·e et ne sert à rien d'autre. Votre suivi local est
          gardé dans votre navigateur, sur votre appareil.
        </p>

        <h2>Votre accord</h2>
        <p>
          La création d'un compte demande de cocher que vous avez lu cette page et que vous acceptez l'enregistrement de votre
          email et de votre suivi. Sans cet accord, aucun compte n'est créé. Vous pouvez supprimer votre compte à tout moment
          depuis la page Suivi.
        </p>

        <h2>Intelligence artificielle</h2>
        <p>
          La recherche intelligente s'appuie sur un modèle d'IA qui peut se tromper. Vérifiez toujours la source
          officielle indiquée sur chaque fiche avant de candidater.
        </p>

        <h2>Se désinscrire ou supprimer ses données</h2>
        <p>
          Pour être retiré des alertes ou faire supprimer une question, écrivez-nous depuis la page Aide en
          précisant l'adresse concernée.
        </p>
      </div>
    </main>
  );
}
