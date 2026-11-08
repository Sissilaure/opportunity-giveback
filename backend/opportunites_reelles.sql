
-- ---------- Questions et réponses ----------
CREATE TABLE IF NOT EXISTS question (
  id CHAR(36) PRIMARY KEY,
  texte TEXT NOT NULL,
  date DATETIME NOT NULL,
  statut ENUM('en_attente', 'repondu') NOT NULL DEFAULT 'en_attente',
  reponse TEXT NULL,
  date_reponse DATETIME NULL,
  INDEX idx_question_statut_date (statut, date)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ---------- Organismes partenaires ----------
CREATE TABLE IF NOT EXISTS structure_partenaire (
  id_structure INT AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(255) NOT NULL,
  site_web VARCHAR(255) NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ---------- Opportunités ----------
CREATE TABLE IF NOT EXISTS opportunite (
  id INT AUTO_INCREMENT PRIMARY KEY,
  titre VARCHAR(255) NOT NULL,
  type ENUM('bourse', 'stage', 'emploi', 'concours', 'autre') NOT NULL DEFAULT 'bourse',
  id_structure INT NOT NULL,
  public_eligible TEXT NULL,
  criteres TEXT NULL,
  pieces_requises TEXT NULL,
  date_echeance DATE NULL,
  lien_source VARCHAR(500) NULL,
  date_verification DATE NULL,
  statut ENUM('verifiee', 'a_verifier', 'expiree') NOT NULL DEFAULT 'a_verifier',
  CONSTRAINT fk_opportunite_structure
    FOREIGN KEY (id_structure) REFERENCES structure_partenaire(id_structure)
    ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ---------- Organismes ----------
INSERT INTO structure_partenaire (nom, site_web) VALUES
('University of Pretoria', 'https://www.up.ac.za'),
('University of the Western Cape (UWC)', 'https://www.uwc.ac.za'),
('Pan-Atlantic University', 'https://www.mastercardfdn.org'),
('University of Global Health Equity (UGHE)', 'https://ughe.org'),
('EARTH University', 'https://www.earth.ac.cr'),
('UEMOA', 'https://www.uemoa.int'),
('Institut 2iE', 'https://www.2ie-edu.org'),
('Gouvernement du Ghana', 'https://scholarships.gov.gh'),
('FEHT', 'https://www.afterschoolafrica.com'),
('Association Ashinaga', 'https://ashinaga.org'),
('University of Warwick', 'https://ashinaga.org'),
('University of Nicosia', 'https://www.unic.ac.cy'),
('APU / Banque africaine de développement', 'https://www.apu.ac.jp'),
('University of Oxford', 'https://www.ox.ac.uk'),
('China Scholarship Council (CSC)', 'https://www.csc.edu.cn'),
('Ministère roumain des Affaires étrangères', 'https://www.studyinromania.gov.ro'),
('Gouvernement français (Campus France)', 'https://www.campusfrance.org'),
('Gouvernement sud-coréen', 'https://www.studyinkorea.go.kr'),
('Gouvernement indien (ICCR)', 'https://a2ascholarships.iccr.gov.in'),
('Qatar University', 'https://www.qu.edu.qa'),
('University College London (UCL)', 'https://www.ucl.ac.uk'),
('King Abdulaziz University', 'https://www.kau.edu.sa'),
('Gouvernement allemand', 'https://www.sbw.berlin'),
('Banque Islamique de Développement', 'https://www.isdb.org'),
('Gouvernement turc', 'https://www.turkiyeburslari.gov.tr');

-- ---------- Opportunités ----------

INSERT INTO opportunite (titre, type, id_structure, public_eligible, criteres, pieces_requises, date_echeance, lien_source, date_verification, statut) VALUES
('Mastercard Foundation Scholars - University of Pretoria (Master)', 'bourse',
 (SELECT id_structure FROM structure_partenaire WHERE nom = 'University of Pretoria'),
 'Ressortissants d''Afrique subsaharienne, niveau Master.',
 'Moyenne minimale de 70 pour cent\nRessortissant d''un pays d''Afrique subsaharienne\nLe cycle Licence 2026 est deja clos, seul le Master reste ouvert',
 'Dossier de candidature universite (voir site officiel)',
 '2026-09-30', 'https://www.up.ac.za/mastercard-foundation-scholars-program', '2026-08-24', 'verifiee');

INSERT INTO opportunite (titre, type, id_structure, public_eligible, criteres, pieces_requises, date_echeance, lien_source, date_verification, statut) VALUES
('Mastercard Foundation Scholars - University of the Western Cape', 'bourse',
 (SELECT id_structure FROM structure_partenaire WHERE nom = 'University of the Western Cape (UWC)'),
 'Ressortissants d''Afrique subsaharienne, niveau Licence ou Master.',
 'Ressortissant d''un pays d''Afrique subsaharienne\nMaximum 26 ans pour le niveau Licence',
 'Dossier de candidature universite (voir site officiel)',
 NULL, 'https://www.uwc.ac.za', '2026-08-24', 'verifiee');

INSERT INTO opportunite (titre, type, id_structure, public_eligible, criteres, pieces_requises, date_echeance, lien_source, date_verification, statut) VALUES
('Mastercard Foundation Scholars - Pan-Atlantic University', 'bourse',
 (SELECT id_structure FROM structure_partenaire WHERE nom = 'Pan-Atlantic University'),
 'Ressortissants d''Afrique subsaharienne, niveau Licence, maximum 29 ans.',
 'Ressortissant d''un pays d''Afrique subsaharienne\nMaximum 29 ans',
 'Dossier de candidature universite (voir site officiel)',
 NULL, 'https://www.mastercardfdn.org', '2026-08-24', 'verifiee');

INSERT INTO opportunite (titre, type, id_structure, public_eligible, criteres, pieces_requises, date_echeance, lien_source, date_verification, statut) VALUES
('Mastercard Foundation Scholars - University of Global Health Equity', 'bourse',
 (SELECT id_structure FROM structure_partenaire WHERE nom = 'University of Global Health Equity (UGHE)'),
 'Ressortissants d''Afrique subsaharienne, niveau Master, maximum 35 ans.',
 'Ressortissant d''un pays d''Afrique subsaharienne\nMaximum 35 ans',
 'Dossier de candidature universite (voir site officiel)',
 NULL, 'https://ughe.org', '2026-08-24', 'verifiee');

INSERT INTO opportunite (titre, type, id_structure, public_eligible, criteres, pieces_requises, date_echeance, lien_source, date_verification, statut) VALUES
('Mastercard Foundation Scholars - EARTH University', 'bourse',
 (SELECT id_structure FROM structure_partenaire WHERE nom = 'EARTH University'),
 'Etudiants d''Afrique subsaharienne, niveau Licence, maximum 29 ans.',
 'Ressortissant d''un pays d''Afrique subsaharienne\nMaximum 29 ans',
 'Dossier de candidature universite (voir site officiel)',
 NULL, 'https://www.earth.ac.cr', '2026-08-24', 'verifiee');

INSERT INTO opportunite (titre, type, id_structure, public_eligible, criteres, pieces_requises, date_echeance, lien_source, date_verification, statut) VALUES
('Bourse d''excellence UEMOA 2026-2029', 'bourse',
 (SELECT id_structure FROM structure_partenaire WHERE nom = 'UEMOA'),
 'Bacheliers 2026 des pays membres de l''UEMOA, niveaux Licence, Master, Doctorat.',
 'Baccalaureat 2026\nMoyenne minimale de 14/20\nMaximum 21 ans au 31/12/2026',
 'Releve de notes du baccalaureat\nPiece d''identite\nDossier de candidature UEMOA (voir site officiel)',
 '2026-08-30', 'https://www.uemoa.int', '2026-08-24', 'verifiee');

INSERT INTO opportunite (titre, type, id_structure, public_eligible, criteres, pieces_requises, date_echeance, lien_source, date_verification, statut) VALUES
('100 bourses Bachelor BGIS - Institut 2iE', 'bourse',
 (SELECT id_structure FROM structure_partenaire WHERE nom = 'Institut 2iE'),
 'Nouveaux bacheliers issus de milieux defavorises, fort potentiel academique, rentree 2026-2027.',
 'Milieu defavorise\nFort potentiel academique demontre',
 'Dossier de candidature 2iE (voir site officiel)',
 NULL, 'https://www.2ie-edu.org', '2026-08-24', 'verifiee');

INSERT INTO opportunite (titre, type, id_structure, public_eligible, criteres, pieces_requises, date_echeance, lien_source, date_verification, statut) VALUES
('Presidential West African Scholarship Initiative (PWASI) 2026', 'bourse',
 (SELECT id_structure FROM structure_partenaire WHERE nom = 'Gouvernement du Ghana'),
 'Citoyens de la CEDEAO hors Ghana, niveaux Licence, Master, Doctorat.',
 'Ressortissant d''un pays membre de la CEDEAO, hors Ghana',
 'Dossier de candidature (voir site officiel)',
 NULL, 'https://scholarships.gov.gh', '2026-08-24', 'verifiee');

INSERT INTO opportunite (titre, type, id_structure, public_eligible, criteres, pieces_requises, date_echeance, lien_source, date_verification, statut) VALUES
('FEHT Undergraduate Scholarship Programme 2026', 'bourse',
 (SELECT id_structure FROM structure_partenaire WHERE nom = 'FEHT'),
 'Etudiants du Nigeria, Cameroun, Togo, Benin, admis en 2026-2027 dans une universite publique, niveau Licence.',
 'Admission confirmee 2026-2027 dans une universite publique',
 'Preuve d''admission universitaire\nDossier de candidature (voir source)',
 NULL, 'https://www.afterschoolafrica.com', '2026-08-24', 'verifiee');

INSERT INTO opportunite (titre, type, id_structure, public_eligible, criteres, pieces_requises, date_echeance, lien_source, date_verification, statut) VALUES
('Bourse Ashinaga', 'bourse',
 (SELECT id_structure FROM structure_partenaire WHERE nom = 'Association Ashinaga'),
 'Etudiants orphelins d''Afrique subsaharienne francophone ou lusophone, niveaux Licence, Master.',
 'Etre orphelin\nAfrique subsaharienne francophone ou lusophone\nDate a reconfirmer aupres de admissions.fr@ashinaga.org',
 'Dossier de candidature (voir site officiel)',
 NULL, 'https://ashinaga.org/fr/our-work/ashinaga-africa-initiative', '2026-08-24', 'verifiee');

INSERT INTO opportunite (titre, type, id_structure, public_eligible, criteres, pieces_requises, date_echeance, lien_source, date_verification, statut) VALUES
('Ashinaga Warwick Scholarships', 'bourse',
 (SELECT id_structure FROM structure_partenaire WHERE nom = 'University of Warwick'),
 'Orphelins ou eleves par un parent seul, Afrique subsaharienne, niveau Licence.',
 'Orphelin ou eleve par un seul parent\nRessortissant d''Afrique subsaharienne',
 'Dossier de candidature (voir site officiel)',
 NULL, 'https://ashinaga.org', '2026-08-24', 'verifiee');

INSERT INTO opportunite (titre, type, id_structure, public_eligible, criteres, pieces_requises, date_echeance, lien_source, date_verification, statut) VALUES
('CyprusAid Scholarship Scheme', 'bourse',
 (SELECT id_structure FROM structure_partenaire WHERE nom = 'University of Nicosia'),
 'Ressortissants du Kenya, Ouganda, Rwanda, Zambie, Botswana, Maurice, Ghana, Senegal, Tanzanie, Madagascar.',
 'Ressortissant d''un des 10 pays eligibles listes',
 'Contacter int.admissions@unic.ac.cy pour le dossier complet',
 NULL, 'https://www.unic.ac.cy', '2026-08-24', 'verifiee');

INSERT INTO opportunite (titre, type, id_structure, public_eligible, criteres, pieces_requises, date_echeance, lien_source, date_verification, statut) VALUES
('Japan Africa Dream Scholarship (JADS) 2027', 'bourse',
 (SELECT id_structure FROM structure_partenaire WHERE nom = 'APU / Banque africaine de développement'),
 'Ressortissants d''un pays membre regional de la BAD, niveau Master (2 ans).',
 'Ressortissant d''un pays membre regional de la Banque Africaine de Developpement\nCycle 2027, dates a confirmer',
 'Dossier de candidature (voir site officiel)',
 NULL, 'https://www.apu.ac.jp', '2026-08-24', 'verifiee');

INSERT INTO opportunite (titre, type, id_structure, public_eligible, criteres, pieces_requises, date_echeance, lien_source, date_verification, statut) VALUES
('Reach Oxford Scholarship', 'bourse',
 (SELECT id_structure FROM structure_partenaire WHERE nom = 'University of Oxford'),
 'Nouveaux bacheliers internationaux de pays eligibles (liste DAC OCDE, dont le Burkina Faso), sauf medecine.',
 'Ressortissant d''un pays de la liste DAC de l''OCDE (le Burkina Faso y figure)\nNiveau Licence, tous domaines sauf medecine\nCandidature a Oxford requise avant la bourse\nOuverture des candidatures 2027 prevue en janvier 2027',
 'Admission prealable a Oxford\nDossier de candidature (voir site officiel)',
 NULL, 'https://www.ox.ac.uk/admissions/undergraduate/fees-and-funding/oxford-bursaries-and-scholarships/reach-oxford', '2026-08-24', 'verifiee');

INSERT INTO opportunite (titre, type, id_structure, public_eligible, criteres, pieces_requises, date_echeance, lien_source, date_verification, statut) VALUES
('Bourse Chinese Government Scholarship (CSC)', 'bourse',
 (SELECT id_structure FROM structure_partenaire WHERE nom = 'China Scholarship Council (CSC)'),
 'Etudiants internationaux, toutes formations sauf medecine.',
 'Toutes formations sauf medecine\nEcheance variable selon le pays, generalement mi-janvier 2027',
 'Dossier de candidature (voir site officiel ou ambassade de Chine)',
 NULL, 'https://www.csc.edu.cn', '2026-08-24', 'verifiee');

INSERT INTO opportunite (titre, type, id_structure, public_eligible, criteres, pieces_requises, date_echeance, lien_source, date_verification, statut) VALUES
('Bourse MFA Roumanie', 'bourse',
 (SELECT id_structure FROM structure_partenaire WHERE nom = 'Ministère roumain des Affaires étrangères'),
 'Toutes formations sauf medecine et pharmacie, niveau Licence.',
 'Toutes formations sauf medecine et pharmacie\nOuverture prevue fin fevrier 2027',
 'Dossier de candidature (voir site officiel)',
 NULL, 'https://www.studyinromania.gov.ro', '2026-08-24', 'verifiee');

INSERT INTO opportunite (titre, type, id_structure, public_eligible, criteres, pieces_requises, date_echeance, lien_source, date_verification, statut) VALUES
('Bourse France Excellence Major', 'bourse',
 (SELECT id_structure FROM structure_partenaire WHERE nom = 'Gouvernement français (Campus France)'),
 'Bacheliers du reseau AEFE (lycees francais a l''etranger), niveau Licence.',
 'Etre bachelier d''un etablissement du reseau AEFE',
 'Dossier de candidature (voir site officiel)',
 NULL, 'https://www.campusfrance.org', '2026-08-24', 'verifiee');

INSERT INTO opportunite (titre, type, id_structure, public_eligible, criteres, pieces_requises, date_echeance, lien_source, date_verification, statut) VALUES
('Bourse Global Korea Scholarship (GKS)', 'bourse',
 (SELECT id_structure FROM structure_partenaire WHERE nom = 'Gouvernement sud-coréen'),
 'Etudiants internationaux niveau Licence, sous reserve d''eligibilite du pays d''origine.',
 'Certains pays ne sont pas eligibles au cycle Licence : verifier selon le pays sur le site officiel\nOuverture attendue septembre-octobre 2026 pour le cycle 2027',
 'Dossier de candidature (voir site officiel)',
 NULL, 'https://www.studyinkorea.go.kr', '2026-08-24', 'verifiee');

INSERT INTO opportunite (titre, type, id_structure, public_eligible, criteres, pieces_requises, date_echeance, lien_source, date_verification, statut) VALUES
('Bourses ICCR India - Africa Maitri', 'bourse',
 (SELECT id_structure FROM structure_partenaire WHERE nom = 'Gouvernement indien (ICCR)'),
 'Etudiants africains, niveau Licence.',
 'Non precise, voir conditions detaillees sur le site officiel',
 'Dossier de candidature (voir site officiel)',
 NULL, 'https://a2ascholarships.iccr.gov.in', '2026-08-24', 'verifiee');

INSERT INTO opportunite (titre, type, id_structure, public_eligible, criteres, pieces_requises, date_echeance, lien_source, date_verification, statut) VALUES
('Bourse Qatar University International Students', 'bourse',
 (SELECT id_structure FROM structure_partenaire WHERE nom = 'Qatar University'),
 'Etudiants internationaux, niveau Licence.',
 'Ouverture prevue mars 2027',
 'Dossier de candidature (voir site officiel)',
 NULL, 'https://www.qu.edu.qa', '2026-08-24', 'verifiee');

INSERT INTO opportunite (titre, type, id_structure, public_eligible, criteres, pieces_requises, date_echeance, lien_source, date_verification, statut) VALUES
('Bourse Global Undergraduate - UCL', 'bourse',
 (SELECT id_structure FROM structure_partenaire WHERE nom = 'University College London (UCL)'),
 'Etudiants internationaux, niveau Licence.',
 'Non precise, voir conditions detaillees sur le site officiel',
 'Dossier de candidature (voir site officiel)',
 NULL, 'https://www.ucl.ac.uk/scholarships', '2026-08-24', 'verifiee');

INSERT INTO opportunite (titre, type, id_structure, public_eligible, criteres, pieces_requises, date_echeance, lien_source, date_verification, statut) VALUES
('Bourse King Abdulaziz University', 'bourse',
 (SELECT id_structure FROM structure_partenaire WHERE nom = 'King Abdulaziz University'),
 'Etudiants internationaux, niveau Licence.',
 'Non precise, voir conditions detaillees sur le site officiel',
 'Dossier de candidature (voir site officiel)',
 NULL, 'https://www.kau.edu.sa', '2026-08-24', 'verifiee');

INSERT INTO opportunite (titre, type, id_structure, public_eligible, criteres, pieces_requises, date_echeance, lien_source, date_verification, statut) VALUES
('Bourses SBW Berlin', 'bourse',
 (SELECT id_structure FROM structure_partenaire WHERE nom = 'Gouvernement allemand'),
 'Jeunes de 18 a 30 ans, niveau Licence.',
 'Age entre 18 et 30 ans\nOuverture prevue mi-octobre 2026',
 'Dossier de candidature (voir site officiel)',
 NULL, 'https://www.sbw.berlin', '2026-08-24', 'verifiee');

INSERT INTO opportunite (titre, type, id_structure, public_eligible, criteres, pieces_requises, date_echeance, lien_source, date_verification, statut) VALUES
('Bourse BID-FSID', 'bourse',
 (SELECT id_structure FROM structure_partenaire WHERE nom = 'Banque Islamique de Développement'),
 'Etudiants internationaux, niveau Licence.',
 'Ouverture prevue fin decembre 2026',
 'Dossier de candidature (voir site officiel)',
 NULL, 'https://www.isdb.org/scholarships', '2026-08-24', 'verifiee');

INSERT INTO opportunite (titre, type, id_structure, public_eligible, criteres, pieces_requises, date_echeance, lien_source, date_verification, statut) VALUES
('Bourse Türkiye Burslari', 'bourse',
 (SELECT id_structure FROM structure_partenaire WHERE nom = 'Gouvernement turc'),
 'Tous domaines y compris medecine, niveau Licence.',
 'Cycle 2026 clos depuis le 20/02/2026\nProchaine ouverture attendue vers janvier 2027',
 'Dossier de candidature (voir site officiel)',
 NULL, 'https://www.turkiyeburslari.gov.tr', '2026-08-24', 'verifiee');

-- ---------- Ajout du 2026-09-12 : premières opportunités stage / emploi / concours / autre ----------
-- Voir migrations/2026-09-12-nouvelles-opportunites.sql pour le détail et le contexte.
-- À réévaluer par l'équipe aux prochaines échéances (30/09, 26/10/2026).

INSERT INTO structure_partenaire (nom, site_web) VALUES
('Organisation des Nations Unies (Secrétariat)', 'https://careers.un.org'),
('Groupe de la Banque mondiale', 'https://www.worldbank.org'),
('Afreximbank (Banque africaine d''import-export)', 'https://www.afreximbank.com'),
('Princeton in Africa', 'https://www.princetoninafrica.org');

INSERT INTO opportunite (titre, type, id_structure, public_eligible, criteres, pieces_requises, date_echeance, lien_source, date_verification, statut) VALUES
('Programme de stages du Secrétariat des Nations Unies', 'stage',
 (SELECT id_structure FROM structure_partenaire WHERE nom = 'Organisation des Nations Unies (Secrétariat)'),
 'Étudiants inscrits en Licence, Master ou Doctorat, ou diplômés depuis moins d''un an.',
 'Être inscrit dans un établissement universitaire ou diplômé depuis moins d''un an\nBonne maîtrise de l''anglais ou du français\nNe pas être un parent direct d''un membre du personnel du Secrétariat de l''ONU\nStage non rémunéré : frais de voyage et de séjour à la charge du candidat',
 'Candidature en ligne via Inspira (CV, lettre de motivation)\nJustificatif d''inscription ou diplôme récent',
 NULL, 'https://careers.un.org', '2026-09-12', 'verifiee');

INSERT INTO opportunite (titre, type, id_structure, public_eligible, criteres, pieces_requises, date_echeance, lien_source, date_verification, statut) VALUES
('Young Professionals Program (YPP) 2027', 'emploi',
 (SELECT id_structure FROM structure_partenaire WHERE nom = 'Groupe de la Banque mondiale'),
 'Jeunes diplômés de Master ou Doctorat, 2 à 6 ans d''expérience professionnelle, ressortissants d''un pays membre du Groupe Banque mondiale.',
 'Diplôme de Master minimum dans un domaine pertinent (économie, finance, ingénierie, sciences sociales...)\nEntre 2 et 6 ans d''expérience professionnelle liée au développement\nÊtre ressortissant d''un pays membre du Groupe de la Banque mondiale\nExcellente maîtrise de l''anglais',
 'Candidature en ligne (CV, relevés de notes, lettre de motivation)\nJustificatifs d''expérience professionnelle',
 '2026-09-30', 'https://www.worldbank.org/ext/en/careers/talent-programs/young-professionals-program', '2026-09-12', 'verifiee');

INSERT INTO opportunite (titre, type, id_structure, public_eligible, criteres, pieces_requises, date_echeance, lien_source, date_verification, statut) VALUES
('Concours de recherche Afreximbank-Edordu 2026', 'concours',
 (SELECT id_structure FROM structure_partenaire WHERE nom = 'Afreximbank (Banque africaine d''import-export)'),
 'Étudiants de Master ou Doctorat inscrits dans un établissement africain (ou d''un État éligible de la CARICOM).',
 'Être ressortissant d''un pays africain ou d''un État éligible de la CARICOM\nÊtre inscrit en Master ou Doctorat dans un établissement accrédité\nSoumettre un article de recherche original et inédit sur le commerce, la finance ou l''intégration africaine\nRédaction possible en arabe, anglais, français, portugais, espagnol ou kiswahili',
 'Article de recherche complet (voir thème de l''édition sur le portail officiel)\nPreuve d''inscription universitaire',
 '2026-09-30', 'https://wknd.canex.africa/newfront/afreximbank-edordu-competition', '2026-09-12', 'verifiee');

INSERT INTO opportunite (titre, type, id_structure, public_eligible, criteres, pieces_requises, date_echeance, lien_source, date_verification, statut) VALUES
('Fellowship Princeton in Africa 2027-2028', 'autre',
 (SELECT id_structure FROM structure_partenaire WHERE nom = 'Princeton in Africa'),
 'Jeunes diplômés (Licence, Master ou Doctorat) d''universités africaines ou américaines, ou étudiants finissant leur cursus avant juin 2027.',
 'Diplôme obtenu (ou en cours d''obtention avant juin 2027) dans une université accréditée africaine ou américaine\nMaximum 35 ans au cours de l''année de la bourse\nAnglais niveau C1 minimum ; arabe, français, kiswahili ou portugais appréciés\nPasseport valide au moins 6 mois après la fin de la bourse',
 'Dossier de candidature en ligne (CV, lettre de motivation, références)\nVoir la liste des postes disponibles sur le site officiel',
 '2026-10-26', 'https://www.princetoninafrica.org/applicants/how-to-apply/', '2026-09-12', 'verifiee');
