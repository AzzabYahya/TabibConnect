const fs = require('fs');
const path = require('path');
const { PrismaClient, Prisma } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const passwordPlain = 'TabibConnect@2026';

const adminSeed = {
  key: 'admin',
  email: 'admin@tabibconnect.ma',
  phone: '+212656789012',
};

const patientSeeds = [
  {
    key: 'youssef-benali',
    email: 'youssef.benali@tabibconnect.ma',
    phone: '+212612345678',
    cin: 'AB123456',
    dateOfNaissance: '1992-05-11T00:00:00.000Z',
    sexe: 'HOMME',
    adresse: 'Maarif Extension, Rue 12',
    ville: 'Casablanca',
    groupeSanguin: 'O_POS',
    antecedents: 'Allergie legere aux penicillines',
  },
  {
    key: 'khadija-elmansouri',
    email: 'khadija.elmansouri@tabibconnect.ma',
    phone: '+212623456789',
    cin: 'CD654321',
    dateOfNaissance: '1988-11-03T00:00:00.000Z',
    sexe: 'FEMME',
    adresse: 'Hay Riad, Avenue Annakhil',
    ville: 'Rabat',
    groupeSanguin: 'A_POS',
    antecedents: 'Aucun antecedent majeur',
  },
  {
    key: 'amina-trabelsi',
    email: 'amina.trabelsi@tabibconnect.ma',
    phone: '+212634567891',
    cin: 'EF987654',
    dateOfNaissance: '1995-02-18T00:00:00.000Z',
    sexe: 'FEMME',
    adresse: 'Gueliz, Rue Mohammed V',
    ville: 'Marrakech',
    groupeSanguin: 'B_POS',
    antecedents: 'Migraine occasionnelle',
  },
  {
    key: 'omar-kabbaj',
    email: 'omar.kabbaj@tabibconnect.ma',
    phone: '+212645678912',
    cin: 'GH456789',
    dateOfNaissance: '1990-07-24T00:00:00.000Z',
    sexe: 'HOMME',
    adresse: 'Ville Nouvelle, Avenue Hassan II',
    ville: 'Fes',
    groupeSanguin: 'O_NEG',
    antecedents: 'Asthme leger bien controle',
  },
  {
    key: 'sara-bennis',
    email: 'sara.bennis@tabibconnect.ma',
    phone: '+212667890123',
    cin: 'IJ321654',
    dateOfNaissance: '1997-09-30T00:00:00.000Z',
    sexe: 'FEMME',
    adresse: 'Talborjt, Boulevard Hassan II',
    ville: 'Agadir',
    groupeSanguin: 'AB_POS',
    antecedents: 'Allergies saisonnieres',
  },
  {
    key: 'hajar-aitali',
    email: 'hajar.aitali@tabibconnect.ma',
    phone: '+212678901235',
    cin: 'KL789123',
    dateOfNaissance: '1985-12-15T00:00:00.000Z',
    sexe: 'FEMME',
    adresse: 'Maarif, Rue des Anges',
    ville: 'Casablanca',
    groupeSanguin: 'A_NEG',
    antecedents: 'Hypertension suivie regulierement',
  },
];

const cabinetSeeds = [
  {
    key: 'casa-coeur',
    nom: 'Cabinet Coeur Casa',
    adresse: 'Bd Ghandi, Immeuble 25',
    ville: 'Casablanca',
    quartier: 'Maarif',
    latitude: '33.573110',
    longitude: '-7.589843',
    phone: '+212522111222',
    photos: [
      'https://images.tabibconnect.ma/cabinets/casa-coeur-1.jpg',
      'https://images.tabibconnect.ma/cabinets/casa-coeur-2.jpg',
    ],
  },
  {
    key: 'rabat-atlas',
    nom: 'Clinique Atlas Rabat',
    adresse: 'Avenue Fal Ould Oumeir',
    ville: 'Rabat',
    quartier: 'Agdal',
    latitude: '34.020882',
    longitude: '-6.841650',
    phone: '+212537333444',
    photos: [
      'https://images.tabibconnect.ma/cabinets/rabat-atlas-1.jpg',
      'https://images.tabibconnect.ma/cabinets/rabat-atlas-2.jpg',
    ],
  },
  {
    key: 'marrakech-palmier',
    nom: 'Centre Medical Palmier',
    adresse: 'Route de Safi, Bloc B',
    ville: 'Marrakech',
    quartier: 'Gueliz',
    latitude: '31.629472',
    longitude: '-7.981084',
    phone: '+212524555666',
    photos: ['https://images.tabibconnect.ma/cabinets/marrakech-palmier-1.jpg'],
  },
  {
    key: 'fes-andalous',
    nom: 'Polyclinique Al Andalous',
    adresse: 'Avenue Hassan II',
    ville: 'Fes',
    quartier: 'Ville Nouvelle',
    latitude: '34.018124',
    longitude: '-5.007845',
    phone: '+212535777888',
    photos: ['https://images.tabibconnect.ma/cabinets/fes-andalous-1.jpg'],
  },
  {
    key: 'agadir-ocean',
    nom: 'Cabinet Ocean Sante',
    adresse: 'Boulevard Mohamed V',
    ville: 'Agadir',
    quartier: 'Talborjt',
    latitude: '30.427755',
    longitude: '-9.598107',
    phone: '+212528999000',
    photos: ['https://images.tabibconnect.ma/cabinets/agadir-ocean-1.jpg'],
  },
  {
    key: 'casa-mer-sultan',
    nom: 'Cabinet Mer Sultan',
    adresse: 'Boulevard Zerktouni',
    ville: 'Casablanca',
    quartier: 'Centre Ville',
    latitude: '33.588310',
    longitude: '-7.610220',
    phone: '+212522333444',
    photos: ['https://images.tabibconnect.ma/cabinets/casa-mer-sultan-1.jpg'],
  },
  {
    key: 'rabat-hay-riad',
    nom: 'Clinique Hay Riad',
    adresse: 'Avenue Annakhil',
    ville: 'Rabat',
    quartier: 'Hay Riad',
    latitude: '34.004550',
    longitude: '-6.804120',
    phone: '+212537555777',
    photos: ['https://images.tabibconnect.ma/cabinets/rabat-hay-riad-1.jpg'],
  },
  {
    key: 'marrakech-gueliz',
    nom: 'Espace Sante Gueliz',
    adresse: 'Boulevard Abdelkrim Khattabi',
    ville: 'Marrakech',
    quartier: 'Gueliz',
    latitude: '31.640780',
    longitude: '-8.002540',
    phone: '+212524777888',
    photos: ['https://images.tabibconnect.ma/cabinets/marrakech-gueliz-1.jpg'],
  },
];

const doctorSeeds = [
  {
    key: 'amine-fassi',
    email: 'dr.amine.fassi@tabibconnect.ma',
    phone: '+212634567890',
    nomComplet: 'Dr Amine Fassi',
    inpe: 'INPE-2026-0001',
    specialite: 'Cardiologie / Tibb Al-Qalb',
    diplomes: [
      'Doctorat Medecine - UM5 Rabat',
      'DES Cardiologie - Casablanca',
      'DU Epreuve d effort - Paris',
    ],
    languesParlees: ['Francais', 'Darija', 'Arabe'],
    tarifConsultation: '400.00',
    accepteAssurance: true,
    assurancesAcceptees: ['CNSS', 'CNOPS', 'AXA'],
    bio: 'Cardiologue avec approche preventive et suivi de proximite.',
    experience: 12,
    cabinetKeys: ['casa-coeur', 'rabat-atlas'],
    document: {
      fileName: 'dr-amine-fassi-diplome.pdf',
      filePath: 'uploads/documents/dr-amine-fassi-diplome.pdf',
      mimeType: 'application/pdf',
      size: 284512,
    },
    availabilitySeeds: [
      {
        key: 'amine-casa-lundi',
        cabinetKey: 'casa-coeur',
        jourSemaine: 'LUNDI',
        heureDebut: '09:00',
        heureFin: '13:00',
        dureeConsultation: 30,
      },
      {
        key: 'amine-rabat-mercredi',
        cabinetKey: 'rabat-atlas',
        jourSemaine: 'MERCREDI',
        heureDebut: '14:00',
        heureFin: '18:00',
        dureeConsultation: 30,
      },
    ],
  },
  {
    key: 'salma-alaoui',
    email: 'dr.salma.alaoui@tabibconnect.ma',
    phone: '+212645678901',
    nomComplet: 'Dr Salma Alaoui',
    inpe: 'INPE-2026-0002',
    specialite: 'Dermatologie / Amrad Al-Jild',
    diplomes: [
      'Doctorat Medecine - Fes',
      'DU Dermatologie Esthetique - Marrakech',
      'Formation Teledermatologie - Lyon',
    ],
    languesParlees: ['Francais', 'Arabe', 'Anglais'],
    tarifConsultation: '350.00',
    accepteAssurance: true,
    assurancesAcceptees: ['CNSS', 'Saham', 'Wafa Assurance'],
    bio: 'Dermatologue specialisee en dermatoses chroniques et tele-suivi.',
    experience: 9,
    cabinetKeys: ['marrakech-palmier', 'fes-andalous'],
    document: {
      fileName: 'dr-salma-alaoui-diplome.pdf',
      filePath: 'uploads/documents/dr-salma-alaoui-diplome.pdf',
      mimeType: 'application/pdf',
      size: 244118,
    },
    availabilitySeeds: [
      {
        key: 'salma-marrakech-mardi',
        cabinetKey: 'marrakech-palmier',
        jourSemaine: 'MARDI',
        heureDebut: '10:00',
        heureFin: '14:00',
        dureeConsultation: 20,
      },
      {
        key: 'salma-fes-jeudi',
        cabinetKey: 'fes-andalous',
        jourSemaine: 'JEUDI',
        heureDebut: '15:00',
        heureFin: '19:00',
        dureeConsultation: 20,
      },
    ],
  },
  {
    key: 'hicham-benyoussef',
    email: 'dr.hicham.benyoussef@tabibconnect.ma',
    phone: '+212690123456',
    nomComplet: 'Dr Hicham Benyoussef',
    inpe: 'INPE-2026-0003',
    specialite: 'Medecine generale / Medecine de famille',
    diplomes: [
      'Doctorat Medecine - Casablanca',
      'DU Medecine de famille - Rabat',
      'Certification urgences de premier recours',
    ],
    languesParlees: ['Francais', 'Darija', 'Arabe'],
    tarifConsultation: '220.00',
    accepteAssurance: false,
    assurancesAcceptees: [],
    bio: 'Medecin de famille avec orientation diagnostic rapide et suivi global.',
    experience: 7,
    cabinetKeys: ['casa-coeur', 'casa-mer-sultan'],
    document: {
      fileName: 'dr-hicham-benyoussef-cv.pdf',
      filePath: 'uploads/documents/dr-hicham-benyoussef-cv.pdf',
      mimeType: 'application/pdf',
      size: 198404,
    },
    availabilitySeeds: [
      {
        key: 'hicham-casa-lundi',
        cabinetKey: 'casa-coeur',
        jourSemaine: 'LUNDI',
        heureDebut: '08:00',
        heureFin: '12:00',
        dureeConsultation: 20,
      },
      {
        key: 'hicham-casa-vendredi',
        cabinetKey: 'casa-mer-sultan',
        jourSemaine: 'VENDREDI',
        heureDebut: '14:00',
        heureFin: '19:00',
        dureeConsultation: 20,
      },
    ],
  },
  {
    key: 'laila-el-idrissi',
    email: 'dr.laila.elidrissi@tabibconnect.ma',
    phone: '+212691234567',
    nomComplet: 'Dr Laila El Idrissi',
    inpe: 'INPE-2026-0004',
    specialite: "Pediatrie / Soins de l'enfant",
    diplomes: [
      'Doctorat Medecine - Rabat',
      'DES Pediatrie - Casablanca',
      'DU Neonatologie - Paris',
    ],
    languesParlees: ['Francais', 'Arabe'],
    tarifConsultation: '260.00',
    accepteAssurance: true,
    assurancesAcceptees: ['CNSS', 'CNOPS'],
    bio: 'Pediatre attentive au suivi de la croissance et aux consultations preventives.',
    experience: 10,
    cabinetKeys: ['rabat-atlas', 'rabat-hay-riad'],
    document: {
      fileName: 'dr-laila-el-idrissi-diplome.pdf',
      filePath: 'uploads/documents/dr-laila-el-idrissi-diplome.pdf',
      mimeType: 'application/pdf',
      size: 226550,
    },
    availabilitySeeds: [
      {
        key: 'laila-rabat-mardi',
        cabinetKey: 'rabat-atlas',
        jourSemaine: 'MARDI',
        heureDebut: '09:00',
        heureFin: '13:00',
        dureeConsultation: 25,
      },
      {
        key: 'laila-rabat-samedi',
        cabinetKey: 'rabat-hay-riad',
        jourSemaine: 'SAMEDI',
        heureDebut: '10:00',
        heureFin: '14:00',
        dureeConsultation: 25,
      },
    ],
  },
  {
    key: 'mehdi-ouhaddou',
    email: 'dr.mehdi.ouhaddou@tabibconnect.ma',
    phone: '+212692345678',
    nomComplet: 'Dr Mehdi Ouhaddou',
    inpe: 'INPE-2026-0005',
    specialite: 'Orthopedie / Traumatologie',
    diplomes: [
      'Doctorat Medecine - Marrakech',
      'DES Orthopedie - Lyon',
      'Formation Arthroscopie - Barcelone',
    ],
    languesParlees: ['Francais', 'Arabe'],
    tarifConsultation: '320.00',
    accepteAssurance: true,
    assurancesAcceptees: ['CNSS', 'AXA'],
    bio: 'Orthopediste expert en traumatologie sportive et recuperation fonctionnelle.',
    experience: 11,
    cabinetKeys: ['marrakech-palmier', 'marrakech-gueliz'],
    document: {
      fileName: 'dr-mehdi-ouhaddou-diplome.pdf',
      filePath: 'uploads/documents/dr-mehdi-ouhaddou-diplome.pdf',
      mimeType: 'application/pdf',
      size: 235880,
    },
    availabilitySeeds: [
      {
        key: 'mehdi-marrakech-mercredi',
        cabinetKey: 'marrakech-palmier',
        jourSemaine: 'MERCREDI',
        heureDebut: '09:00',
        heureFin: '12:00',
        dureeConsultation: 30,
      },
      {
        key: 'mehdi-gueliz-vendredi',
        cabinetKey: 'marrakech-gueliz',
        jourSemaine: 'VENDREDI',
        heureDebut: '13:00',
        heureFin: '17:00',
        dureeConsultation: 30,
      },
    ],
  },
  {
    key: 'nora-rachidi',
    email: 'dr.nora.rachidi@tabibconnect.ma',
    phone: '+212693456789',
    nomComplet: 'Dr Nora Rachidi',
    inpe: 'INPE-2026-0006',
    specialite: 'Neurologie / Aasab',
    diplomes: [
      'Doctorat Medecine - Fes',
      'DES Neurologie - Marseille',
      'DU Cefalee et migraine - Madrid',
    ],
    languesParlees: ['Francais', 'Arabe', 'Anglais'],
    tarifConsultation: '380.00',
    accepteAssurance: true,
    assurancesAcceptees: ['CNSS', 'Saham', 'Wafa Assurance'],
    bio: 'Neurologue orientee diagnostic des migraines, vertiges et troubles du sommeil.',
    experience: 8,
    cabinetKeys: ['fes-andalous', 'agadir-ocean'],
    document: {
      fileName: 'dr-nora-rachidi-diplome.pdf',
      filePath: 'uploads/documents/dr-nora-rachidi-diplome.pdf',
      mimeType: 'application/pdf',
      size: 248330,
    },
    availabilitySeeds: [
      {
        key: 'nora-fes-jeudi',
        cabinetKey: 'fes-andalous',
        jourSemaine: 'JEUDI',
        heureDebut: '10:00',
        heureFin: '14:00',
        dureeConsultation: 30,
      },
      {
        key: 'nora-agadir-samedi',
        cabinetKey: 'agadir-ocean',
        jourSemaine: 'SAMEDI',
        heureDebut: '09:00',
        heureFin: '13:00',
        dureeConsultation: 30,
      },
    ],
  },
  {
    key: 'youssef-berrada',
    email: 'dr.youssef.berrada@tabibconnect.ma',
    phone: '+212694567890',
    nomComplet: 'Dr Youssef Berrada',
    inpe: 'INPE-2026-0007',
    specialite: 'ORL / Anf Oudhoun Hanjara',
    diplomes: [
      'Doctorat Medecine - Casablanca',
      'DES ORL - Toulouse',
      'DU Rinosinusite chronique - Lille',
    ],
    languesParlees: ['Francais', 'Darija', 'Arabe'],
    tarifConsultation: '300.00',
    accepteAssurance: false,
    assurancesAcceptees: [],
    bio: 'ORL avec forte activite en consultation video pour second avis et suivi.',
    experience: 6,
    cabinetKeys: ['agadir-ocean', 'casa-mer-sultan'],
    document: {
      fileName: 'dr-youssef-berrada-diplome.pdf',
      filePath: 'uploads/documents/dr-youssef-berrada-diplome.pdf',
      mimeType: 'application/pdf',
      size: 210440,
    },
    availabilitySeeds: [
      {
        key: 'berrada-agadir-mardi',
        cabinetKey: 'agadir-ocean',
        jourSemaine: 'MARDI',
        heureDebut: '09:00',
        heureFin: '13:00',
        dureeConsultation: 20,
      },
      {
        key: 'berrada-casa-jeudi',
        cabinetKey: 'casa-mer-sultan',
        jourSemaine: 'JEUDI',
        heureDebut: '14:00',
        heureFin: '18:00',
        dureeConsultation: 20,
      },
    ],
  },
];

const appointmentSeeds = [
  {
    key: 'rdv-amine-confirme',
    patientKey: 'youssef-benali',
    doctorKey: 'amine-fassi',
    cabinetKey: 'casa-coeur',
    availabilityKey: 'amine-casa-lundi',
    statut: 'CONFIRME',
    motif: 'Douleur thoracique intermittente',
    typeConsultation: 'PRESENTIEL',
    notes: 'Apporter bilan sanguin recent.',
    rappelEnvoye: true,
    dateHeure: '2026-05-04T09:30:00.000Z',
    confirmedAt: '2026-05-02T08:10:00.000Z',
  },
  {
    key: 'rdv-amine-complete',
    patientKey: 'khadija-elmansouri',
    doctorKey: 'amine-fassi',
    cabinetKey: 'rabat-atlas',
    availabilityKey: 'amine-rabat-mercredi',
    statut: 'COMPLETE',
    motif: 'Controle de pression arterielle',
    typeConsultation: 'PRESENTIEL',
    notes: 'Bilan lipidique revu.',
    rappelEnvoye: true,
    dateHeure: '2026-04-15T11:00:00.000Z',
    confirmedAt: '2026-04-13T16:00:00.000Z',
    completedAt: '2026-04-15T11:45:00.000Z',
  },
  {
    key: 'rdv-salma-complete',
    patientKey: 'amina-trabelsi',
    doctorKey: 'salma-alaoui',
    cabinetKey: 'marrakech-palmier',
    availabilityKey: 'salma-marrakech-mardi',
    statut: 'COMPLETE',
    motif: 'Acne inflammatoire chronique',
    typeConsultation: 'PRESENTIEL',
    notes: 'Traitement local prescrit.',
    rappelEnvoye: true,
    dateHeure: '2026-04-16T10:30:00.000Z',
    completedAt: '2026-04-16T11:05:00.000Z',
  },
  {
    key: 'rdv-salma-attente',
    patientKey: 'omar-kabbaj',
    doctorKey: 'salma-alaoui',
    cabinetKey: 'fes-andalous',
    availabilityKey: 'salma-fes-jeudi',
    statut: 'EN_ATTENTE',
    motif: 'Controle des plaques cutanees',
    typeConsultation: 'PRESENTIEL',
    notes: 'Envoyer des photos avant la consultation.',
    rappelEnvoye: false,
    dateHeure: '2026-05-09T15:20:00.000Z',
  },
  {
    key: 'rdv-hicham-attente',
    patientKey: 'sara-bennis',
    doctorKey: 'hicham-benyoussef',
    cabinetKey: 'casa-mer-sultan',
    availabilityKey: 'hicham-casa-vendredi',
    statut: 'EN_ATTENTE',
    motif: 'Consultation generale a distance',
    typeConsultation: 'TELECONSULTATION',
    notes: 'A faire apres le travail.',
    rappelEnvoye: false,
    dateHeure: '2026-05-11T08:30:00.000Z',
  },
  {
    key: 'rdv-hicham-annule',
    patientKey: 'hajar-aitali',
    doctorKey: 'hicham-benyoussef',
    cabinetKey: 'casa-coeur',
    availabilityKey: 'hicham-casa-lundi',
    statut: 'ANNULE',
    motif: 'Contrôle repousse pour raison personnelle',
    typeConsultation: 'PRESENTIEL',
    notes: 'Nouvelle date a replanifier.',
    cancellationReason: 'Empêchement personnel',
    cancelledAt: '2026-04-18T09:00:00.000Z',
    cancelledByRole: 'PATIENT',
    rappelEnvoye: false,
    dateHeure: '2026-04-18T09:30:00.000Z',
  },
  {
    key: 'rdv-laila-confirme',
    patientKey: 'youssef-benali',
    doctorKey: 'laila-el-idrissi',
    cabinetKey: 'rabat-atlas',
    availabilityKey: 'laila-rabat-mardi',
    statut: 'CONFIRME',
    motif: 'Consultation pediatrique pour enfant',
    typeConsultation: 'PRESENTIEL',
    notes: 'Apporter carnet de vaccination.',
    rappelEnvoye: true,
    dateHeure: '2026-05-08T10:30:00.000Z',
    confirmedAt: '2026-05-06T12:15:00.000Z',
  },
  {
    key: 'rdv-laila-complete',
    patientKey: 'khadija-elmansouri',
    doctorKey: 'laila-el-idrissi',
    cabinetKey: 'rabat-hay-riad',
    availabilityKey: 'laila-rabat-samedi',
    statut: 'COMPLETE',
    motif: 'Suivi nourrisson',
    typeConsultation: 'PRESENTIEL',
    notes: 'Courbe de croissance rassurante.',
    rappelEnvoye: true,
    dateHeure: '2026-04-19T14:00:00.000Z',
    confirmedAt: '2026-04-17T11:00:00.000Z',
    completedAt: '2026-04-19T14:35:00.000Z',
  },
  {
    key: 'rdv-mehdi-no-show',
    patientKey: 'amina-trabelsi',
    doctorKey: 'mehdi-ouhaddou',
    cabinetKey: 'marrakech-palmier',
    availabilityKey: 'mehdi-marrakech-mercredi',
    statut: 'NO_SHOW',
    motif: 'Douleur au genou apres sport',
    typeConsultation: 'PRESENTIEL',
    notes: 'Patient absent malgre rappel.',
    rappelEnvoye: true,
    dateHeure: '2026-04-21T09:30:00.000Z',
    noShowAt: '2026-04-21T10:10:00.000Z',
  },
  {
    key: 'rdv-mehdi-confirme',
    patientKey: 'omar-kabbaj',
    doctorKey: 'mehdi-ouhaddou',
    cabinetKey: 'marrakech-gueliz',
    availabilityKey: 'mehdi-gueliz-vendredi',
    statut: 'CONFIRME',
    motif: 'Suivi post-accident',
    typeConsultation: 'PRESENTIEL',
    notes: 'Scanner du genou a apporter.',
    rappelEnvoye: false,
    dateHeure: '2026-05-09T14:00:00.000Z',
    confirmedAt: '2026-05-01T17:45:00.000Z',
  },
  {
    key: 'rdv-nora-complete',
    patientKey: 'sara-bennis',
    doctorKey: 'nora-rachidi',
    cabinetKey: 'fes-andalous',
    availabilityKey: 'nora-fes-jeudi',
    statut: 'COMPLETE',
    motif: 'Migraine recurrente',
    typeConsultation: 'TELECONSULTATION',
    notes: 'Journal des crises transmis en amont.',
    rappelEnvoye: true,
    dateHeure: '2026-04-20T16:00:00.000Z',
    completedAt: '2026-04-20T16:28:00.000Z',
  },
  {
    key: 'rdv-nora-attente',
    patientKey: 'hajar-aitali',
    doctorKey: 'nora-rachidi',
    cabinetKey: 'agadir-ocean',
    availabilityKey: 'nora-agadir-samedi',
    statut: 'EN_ATTENTE',
    motif: 'Evaluation neurologique en visio',
    typeConsultation: 'TELECONSULTATION',
    notes: 'Lien video a envoyer le jour J.',
    rappelEnvoye: false,
    dateHeure: '2026-05-16T10:15:00.000Z',
  },
  {
    key: 'rdv-berrada-complete',
    patientKey: 'youssef-benali',
    doctorKey: 'youssef-berrada',
    cabinetKey: 'agadir-ocean',
    availabilityKey: 'berrada-agadir-mardi',
    statut: 'COMPLETE',
    motif: 'Sinusites a repetition',
    typeConsultation: 'TELECONSULTATION',
    notes: 'Diagnostic ORL confirme.',
    rappelEnvoye: true,
    dateHeure: '2026-04-17T13:00:00.000Z',
    completedAt: '2026-04-17T13:25:00.000Z',
  },
  {
    key: 'rdv-berrada-attente',
    patientKey: 'khadija-elmansouri',
    doctorKey: 'youssef-berrada',
    cabinetKey: 'casa-mer-sultan',
    availabilityKey: 'berrada-casa-jeudi',
    statut: 'EN_ATTENTE',
    motif: 'Rhinite allergique',
    typeConsultation: 'TELECONSULTATION',
    notes: 'Lien video et prescriptions a prevoir.',
    rappelEnvoye: false,
    dateHeure: '2026-05-11T18:00:00.000Z',
  },
];

const reviewSeeds = [
  {
    key: 'avis-amine',
    patientKey: 'khadija-elmansouri',
    doctorKey: 'amine-fassi',
    rendezVousKey: 'rdv-amine-complete',
    note: 5,
    commentaire: 'Tres bon suivi et explications claires sur le traitement.',
    isVerified: true,
  },
  {
    key: 'avis-salma',
    patientKey: 'amina-trabelsi',
    doctorKey: 'salma-alaoui',
    rendezVousKey: 'rdv-salma-complete',
    note: 5,
    commentaire: 'Consultation rassurante et conseils tres utiles pour ma peau.',
    isVerified: true,
  },
  {
    key: 'avis-laila',
    patientKey: 'khadija-elmansouri',
    doctorKey: 'laila-el-idrissi',
    rendezVousKey: 'rdv-laila-complete',
    note: 5,
    commentaire: 'Excellent contact avec les enfants, tres pedagogue.',
    isVerified: true,
  },
  {
    key: 'avis-nora',
    patientKey: 'sara-bennis',
    doctorKey: 'nora-rachidi',
    rendezVousKey: 'rdv-nora-complete',
    note: 4,
    commentaire: 'Prise en charge tres serieuse et suivi bien structure.',
    isVerified: true,
  },
  {
    key: 'avis-berrada',
    patientKey: 'youssef-benali',
    doctorKey: 'youssef-berrada',
    rendezVousKey: 'rdv-berrada-complete',
    note: 5,
    commentaire: 'Consultation video fluide et diagnostic ORL clair.',
    isVerified: true,
  },
];

const notificationSeeds = [
  {
    key: 'notif-youssef-confirmation',
    userKey: 'youssef-benali',
    type: 'RDV_CONFIRME',
    message: 'Votre rendez-vous avec Dr Amine Fassi est confirme.',
    isRead: false,
  },
  {
    key: 'notif-youssef-rappel',
    userKey: 'youssef-benali',
    type: 'RAPPEL_RDV',
    message: 'Rappel: consultation demain a 09:30 a Casablanca.',
    isRead: false,
  },
  {
    key: 'notif-khadija-confirmation',
    userKey: 'khadija-elmansouri',
    type: 'RDV_CONFIRME',
    message: 'Votre rendez-vous pediatrique est confirme.',
    isRead: false,
  },
  {
    key: 'notif-khadija-systeme',
    userKey: 'khadija-elmansouri',
    type: 'SYSTEME',
    message: 'Bienvenue sur TabibConnect.',
    isRead: true,
  },
  {
    key: 'notif-omar-annulation',
    userKey: 'omar-kabbaj',
    type: 'RDV_ANNULE',
    message: 'Votre rendez-vous en orthopedie a bien ete annule.',
    isRead: false,
  },
  {
    key: 'notif-sara-rappel',
    userKey: 'sara-bennis',
    type: 'RAPPEL_RDV',
    message: 'Votre consultation neurologique approche.',
    isRead: false,
  },
  {
    key: 'notif-hajar-confirmation',
    userKey: 'hajar-aitali',
    type: 'RDV_CONFIRME',
    message: 'Votre rendez-vous ORL est confirme.',
    isRead: false,
  },
  {
    key: 'notif-amine-systeme',
    userKey: 'amine-fassi',
    type: 'SYSTEME',
    message: 'Nouvelle base de patients alimentee pour vos consultations.',
    isRead: false,
  },
  {
    key: 'notif-salma-systeme',
    userKey: 'salma-alaoui',
    type: 'SYSTEME',
    message: 'Votre profil dermatologique a ete enrichi avec de nouveaux rendez-vous.',
    isRead: false,
  },
  {
    key: 'notif-nora-systeme',
    userKey: 'nora-rachidi',
    type: 'SYSTEME',
    message: 'Des consultations neurologiques sont en attente.',
    isRead: false,
  },
  {
    key: 'notif-admin-systeme',
    userKey: 'admin',
    type: 'SYSTEME',
    message: 'La base de donnes TabibConnect est maintenant bien alimentee.',
    isRead: true,
  },
];

const paymentSeeds = [
  {
    key: 'payment-amine-complete',
    rendezVousKey: 'rdv-amine-complete',
    doctorKey: 'amine-fassi',
    montant: '400.00',
    methode: 'CMI',
    statut: 'PAYE',
    reference: 'PAY-TC-2026-0001',
  },
  {
    key: 'payment-salma-complete',
    rendezVousKey: 'rdv-salma-complete',
    doctorKey: 'salma-alaoui',
    montant: '350.00',
    methode: 'CASH',
    statut: 'PAYE',
    reference: 'PAY-TC-2026-0002',
  },
  {
    key: 'payment-laila-complete',
    rendezVousKey: 'rdv-laila-complete',
    doctorKey: 'laila-el-idrissi',
    montant: '260.00',
    methode: 'VIREMENT',
    statut: 'PAYE',
    reference: 'PAY-TC-2026-0003',
  },
  {
    key: 'payment-nora-complete',
    rendezVousKey: 'rdv-nora-complete',
    doctorKey: 'nora-rachidi',
    montant: '380.00',
    methode: 'CMI',
    statut: 'PAYE',
    reference: 'PAY-TC-2026-0004',
  },
  {
    key: 'payment-berrada-complete',
    rendezVousKey: 'rdv-berrada-complete',
    doctorKey: 'youssef-berrada',
    montant: '300.00',
    methode: 'CASH',
    statut: 'PAYE',
    reference: 'PAY-TC-2026-0005',
  },
];

const slugify = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const buildPhone = (seriesDigit, index) => `+212${seriesDigit}${String(70000000 + index).slice(-8)}`;

const addDays = (date, days) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

const buildIsoDate = (baseDate, dayOffset, hourOffset = 0) =>
  new Date(addDays(baseDate, dayOffset).getTime() + hourOffset * 60 * 60 * 1000).toISOString();

const pickFromPool = (pool, index) => pool[index % pool.length];

const getSeedFileMeta = (relativePath) => {
  const absolutePath = path.resolve(__dirname, '..', relativePath);
  const fileName = path.basename(relativePath);
  const extension = path.extname(fileName).toLowerCase();
  const mimeTypeByExtension = {
    '.pdf': 'application/pdf',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
  };

  let size = 0;
  try {
    size = fs.statSync(absolutePath).size;
  } catch {
    size = 0;
  }

  return {
    fileName,
    filePath: relativePath,
    mimeType: mimeTypeByExtension[extension] || 'application/octet-stream',
    size,
  };
};

const extraCityCatalog = [
  {
    ville: 'Tanger',
    quartiers: ['Iberia', 'Malabata'],
    latitude: '35.759465',
    longitude: '-5.833954',
  },
  {
    ville: 'Kenitra',
    quartiers: ['Centre Ville', 'Mimosas'],
    latitude: '34.261005',
    longitude: '-6.580200',
  },
  {
    ville: 'Meknes',
    quartiers: ['Hamria', 'Ville Nouvelle'],
    latitude: '33.893521',
    longitude: '-5.547638',
  },
  {
    ville: 'Oujda',
    quartiers: ['Lazaret', 'Centre Ville'],
    latitude: '34.681393',
    longitude: '-1.909856',
  },
  {
    ville: 'Tetouan',
    quartiers: ['Martil', 'Sania'],
    latitude: '35.571090',
    longitude: '-5.372420',
  },
  {
    ville: 'Safi',
    quartiers: ['Quartier Industriel', 'Centre Ville'],
    latitude: '32.299390',
    longitude: '-9.237180',
  },
  {
    ville: 'El Jadida',
    quartiers: ['Sidi Bouzid', 'Centre Ville'],
    latitude: '33.233333',
    longitude: '-8.500000',
  },
  {
    ville: 'Laayoune',
    quartiers: ['Centre Ville', 'Hay Al Qods'],
    latitude: '27.153610',
    longitude: '-13.203340',
  },
  {
    ville: 'Nador',
    quartiers: ['Al Matar', 'Beni Ensar', 'Centre Ville'],
    latitude: '35.168905',
    longitude: '-2.933523',
  },
  {
    ville: 'Beni Mellal',
    quartiers: ['Agdal', 'Ouled Hamdane', 'Centre Ville'],
    latitude: '32.337086',
    longitude: '-6.349322',
  },
  {
    ville: 'Errachidia',
    quartiers: ['Centre Ville', 'Hay Moulay Ali Cherif', 'Medina'],
    latitude: '31.931364',
    longitude: '-4.426637',
  },
  {
    ville: 'Dakhla',
    quartiers: ['Centre Ville', 'Hay Al Wahda', 'Corniche'],
    latitude: '23.684770',
    longitude: '-15.957980',
  },
];

const patientFirstNames = ['Rania', 'Salma', 'Hajar', 'Amina', 'Nour', 'Sanae', 'Imane', 'Sara', 'Khadija', 'Meryem', 'Lina', 'Aya', 'Yasmine', 'Asma'];
const patientLastNames = ['El Amrani', 'Bennani', 'El Idrissi', 'El Mansouri', 'Ait Ali', 'Berrada', 'Fassi', 'Ziani', 'Alaoui', 'Touimi'];
const patientCities = [
  'Casablanca',
  'Rabat',
  'Marrakech',
  'Fes',
  'Agadir',
  'Tanger',
  'Kenitra',
  'Meknes',
  'Oujda',
  'Tetouan',
  'Safi',
  'El Jadida',
  'Laayoune',
  'Nador',
  'Beni Mellal',
  'Errachidia',
  'Dakhla',
];
const patientBloodTypes = ['O_POS', 'A_POS', 'B_POS', 'AB_POS', 'O_NEG', 'A_NEG', 'B_NEG', 'AB_NEG'];
const patientAntecedentPool = [
  'Aucun antecedent majeur',
  'Allergies saisonnieres',
  'Migraine occasionnelle',
  'Hypertension suivie regulierement',
  'Asthme leger bien controle',
  'Diabete type 2 stabilise',
  'Douleurs lombaires recurrentes',
  'Tension elevee sous surveillance',
];

const doctorFirstNames = ['Meryem', 'Nadia', 'Hamza', 'Youssef', 'Amina', 'Sara', 'Omar', 'Khalid', 'Lina', 'Aya'];
const doctorLastNames = ['Bakkali', 'El Fassi', 'Saidi', 'Amrani', 'Bennani', 'El Idrissi', 'Ait Lahcen', 'Lahlou', 'Toumi', 'Azzouzi'];
const patientCinPhotoPool = [
  'uploads/documents/1777373814924-146482747-cin_maroc-1024x670.jpg',
  'uploads/documents/1777373874441-881288939-cin_maroc-1024x670.jpg',
  'uploads/documents/1777373880363-801025610-cin_maroc-1024x670.jpg',
  'uploads/documents/1777374162294-535149088-cin_maroc-1024x670.jpg',
  'uploads/documents/1777374170039-901815460-cin_maroc-1024x670.jpg',
  'uploads/documents/1777562677308-127306106-cin_maroc-1024x670.jpg',
];
const profilePhotoPool = [
  'uploads/documents/1777374146034-572627411-download.png',
  'uploads/documents/1777374146037-578328700-banner-04.jpg',
  'uploads/documents/1777374151985-348949338-download.png',
  'uploads/documents/1777374151985-431930766-banner-04.jpg',
  'uploads/documents/1777562677305-385031539-banner-04.jpg',
  'uploads/documents/1777727384365-850967433-image-yahya.jpeg',
  'uploads/documents/1777892082202-182885748-image-yahya.jpeg',
  'uploads/documents/1777912526435-423343602-image-yahya.jpeg',
  'uploads/documents/1777941831931-372191833-wallpapersden.com_muzan-kibutsuji-demon-slayer_2560x1440.jpg',
];
const doctorSupportingDocPool = [
  'uploads/documents/1777046479746-782394478-inpetestyahyadr.pdf',
  'uploads/documents/1777373758181-574124961-document-sans-titre.pdf',
  'uploads/documents/1777373762113-936880416-document-sans-titre.pdf',
];
const cabinetPhotoPool = [
  'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200',
  'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1200',
  'https://images.unsplash.com/photo-1551190822-a9333d879b1f?w=1200',
  'https://images.unsplash.com/photo-1580281657521-3a7b4f6c6df3?w=1200',
];
const doctorSpecialtyTemplates = [
  {
    specialite: 'Gynecologie / Obstetrique',
    tarifConsultation: '450.00',
    experience: 13,
    accepteAssurance: true,
    assurancesAcceptees: ['CNSS', 'CNOPS', 'Wafa Assurance'],
    languesParlees: ['Francais', 'Arabe'],
    diplomes: ['Doctorat Medecine - Rabat', 'DES Gynecologie - Casablanca'],
    bio: 'Suivi prenatal, consultation gynecologique et accompagnement feminin.',
    availabilitySeeds: [
      { jourSemaine: 'MARDI', heureDebut: '09:00', heureFin: '13:00', dureeConsultation: 30 },
      { jourSemaine: 'JEUDI', heureDebut: '14:00', heureFin: '18:00', dureeConsultation: 30 },
    ],
    motifs: ['Suivi prenatal', 'Douleurs pelviennes', 'Consultation de routine'],
    reviews: [
      'Tres bonne ecoute et explications rassurantes.',
      'Suivi clair et professionnalisme remarquable.',
      'Excellent accompagnement du debut a la fin.',
    ],
  },
  {
    specialite: 'Ophtalmologie / Vision',
    tarifConsultation: '320.00',
    experience: 9,
    accepteAssurance: true,
    assurancesAcceptees: ['CNSS', 'AXA'],
    languesParlees: ['Francais', 'Darija', 'Arabe'],
    diplomes: ['Doctorat Medecine - Casablanca', 'DES Ophtalmologie - Lyon'],
    bio: 'Consultations de la vision, correction et suivi de la sante oculaire.',
    availabilitySeeds: [
      { jourSemaine: 'LUNDI', heureDebut: '10:00', heureFin: '14:00', dureeConsultation: 20 },
      { jourSemaine: 'MERCREDI', heureDebut: '15:00', heureFin: '19:00', dureeConsultation: 20 },
    ],
    motifs: ['Vision floue', 'Controle de lunettes', 'Irritation oculaire'],
    reviews: [
      'Prise en charge rapide et tres precise.',
      'Diagnostic clair et conseil utile.',
      'Excellent contact avec les patients.',
    ],
  },
  {
    specialite: 'Pneumologie / Respiration',
    tarifConsultation: '280.00',
    experience: 11,
    accepteAssurance: true,
    assurancesAcceptees: ['CNSS', 'Saham'],
    languesParlees: ['Francais', 'Arabe'],
    diplomes: ['Doctorat Medecine - Fes', 'DES Pneumologie - Marseille'],
    bio: 'Suivi respiratoire, asthme, allergies et troubles du sommeil.',
    availabilitySeeds: [
      { jourSemaine: 'MARDI', heureDebut: '08:30', heureFin: '12:30', dureeConsultation: 25 },
      { jourSemaine: 'VENDREDI', heureDebut: '13:30', heureFin: '17:30', dureeConsultation: 25 },
    ],
    motifs: ['Essoufflement', 'Asthme', 'Toux persistante'],
    reviews: [
      'Suivi respiratoire tres complet.',
      'Medecin a l ecoute et tres pedagogique.',
      'Consultation rassurante et efficace.',
    ],
  },
  {
    specialite: 'Endocrinologie / Diabete',
    tarifConsultation: '360.00',
    experience: 12,
    accepteAssurance: true,
    assurancesAcceptees: ['CNSS', 'CNOPS', 'Wafa Assurance'],
    languesParlees: ['Francais', 'Arabe', 'Anglais'],
    diplomes: ['Doctorat Medecine - Marrakech', 'DES Endocrinologie - Paris'],
    bio: 'Prise en charge du diabete, thyroide et troubles hormonaux.',
    availabilitySeeds: [
      { jourSemaine: 'LUNDI', heureDebut: '09:30', heureFin: '13:30', dureeConsultation: 25 },
      { jourSemaine: 'JEUDI', heureDebut: '14:30', heureFin: '18:30', dureeConsultation: 25 },
    ],
    motifs: ['Diabete', 'Thyroide', 'Bilan hormonal'],
    reviews: [
      'Tres bon suivi du dossier et des analyses.',
      'Explications claires sur le traitement.',
      'Le parcours est fluide et rassurant.',
    ],
  },
  {
    specialite: 'Gastroenterologie / Digestion',
    tarifConsultation: '390.00',
    experience: 10,
    accepteAssurance: false,
    assurancesAcceptees: [],
    languesParlees: ['Francais', 'Darija'],
    diplomes: ['Doctorat Medecine - Rabat', 'DES Gastroenterologie - Toulouse'],
    bio: 'Prise en charge des troubles digestifs et du suivi hepatique.',
    availabilitySeeds: [
      { jourSemaine: 'MERCREDI', heureDebut: '10:00', heureFin: '14:00', dureeConsultation: 30 },
      { jourSemaine: 'SAMEDI', heureDebut: '09:00', heureFin: '13:00', dureeConsultation: 30 },
    ],
    motifs: ['Douleurs abdominales', 'Reflux', 'Suivi digestif'],
    reviews: [
      'Diagnostic rapide et conseils adaptes.',
      'Tres bonne prise en charge et suivi.',
      'Consultation serieuse avec explications claires.',
    ],
  },
  {
    specialite: 'Psychiatrie / Sante mentale',
    tarifConsultation: '420.00',
    experience: 8,
    accepteAssurance: true,
    assurancesAcceptees: ['CNSS', 'AXA'],
    languesParlees: ['Francais', 'Arabe'],
    diplomes: ['Doctorat Medecine - Casablanca', 'DES Psychiatrie - Lyon'],
    bio: 'Consultations de soutien psychologique, anxiete et suivi emotionnel.',
    availabilitySeeds: [
      { jourSemaine: 'MARDI', heureDebut: '11:00', heureFin: '15:00', dureeConsultation: 40 },
      { jourSemaine: 'JEUDI', heureDebut: '15:00', heureFin: '19:00', dureeConsultation: 40 },
    ],
    motifs: ['Anxiete', 'Troubles du sommeil', 'Soutien psychologique'],
    reviews: [
      'Ecoute attentive et cadre rassurant.',
      'Tres professionnel et bienveillant.',
      'Le suivi est clair et humain.',
    ],
  },
  {
    specialite: 'Urologie / Appareil urinaire',
    tarifConsultation: '340.00',
    experience: 10,
    accepteAssurance: true,
    assurancesAcceptees: ['CNSS', 'CNOPS'],
    languesParlees: ['Francais', 'Arabe'],
    diplomes: ['Doctorat Medecine - Fes', 'DES Urologie - Madrid'],
    bio: 'Prise en charge des troubles urinaires et du suivi urologique.',
    availabilitySeeds: [
      { jourSemaine: 'LUNDI', heureDebut: '08:00', heureFin: '12:00', dureeConsultation: 25 },
      { jourSemaine: 'VENDREDI', heureDebut: '13:00', heureFin: '17:00', dureeConsultation: 25 },
    ],
    motifs: ['Brulures urinaires', 'Suivi prostate', 'Douleur lombaire'],
    reviews: [
      'Rapide et tres rassurant.',
      'Consultation efficace avec suivi clair.',
      'Explication simple et precise.',
    ],
  },
  {
    specialite: 'Rhumatologie / Articulations',
    tarifConsultation: '300.00',
    experience: 14,
    accepteAssurance: true,
    assurancesAcceptees: ['CNSS', 'Saham', 'Wafa Assurance'],
    languesParlees: ['Francais', 'Arabe', 'Darija'],
    diplomes: ['Doctorat Medecine - Marrakech', 'DES Rhumatologie - Paris'],
    bio: 'Suivi des douleurs articulaires, inflammations et pathologies chroniques.',
    availabilitySeeds: [
      { jourSemaine: 'MERCREDI', heureDebut: '09:00', heureFin: '13:00', dureeConsultation: 30 },
      { jourSemaine: 'SAMEDI', heureDebut: '10:00', heureFin: '14:00', dureeConsultation: 30 },
    ],
    motifs: ['Douleurs articulaires', 'Rhumatisme', 'Raideurs matinales'],
    reviews: [
      'Tres bon suivi des douleurs chroniques.',
      'Excellente ecoute et prise en charge.',
      'Consultation claire et rassurante.',
    ],
  },
];

const buildExtraPatientSeeds = () =>
  patientFirstNames.flatMap((firstName, firstIndex) =>
    patientLastNames.map((lastName, lastIndex) => {
      const index = firstIndex * patientLastNames.length + lastIndex;
      const city = patientCities[index % patientCities.length];
      const isFemale = ['Rania', 'Salma', 'Hajar', 'Amina', 'Nour'].includes(firstName);

      return {
        key: `extra-patient-${index + 1}`,
        email: `${slugify(firstName)}.${slugify(lastName)}@tabibconnect.ma`,
        phone: buildPhone('7', index + 1),
        cin: `PX${String(100000 + index).slice(-6)}`,
        dateOfNaissance: `${1978 + (index % 22)}-${String((index % 12) + 1).padStart(2, '0')}-${String((index % 27) + 1).padStart(2, '0')}T00:00:00.000Z`,
        sexe: isFemale ? 'FEMME' : 'HOMME',
        adresse: `${city} - Quartier ${String.fromCharCode(65 + (index % 5))}`,
        ville: city,
        groupeSanguin: patientBloodTypes[index % patientBloodTypes.length],
        antecedents: patientAntecedentPool[index % patientAntecedentPool.length],
      };
    })
  );

const buildExtraCabinetSeeds = () =>
  extraCityCatalog.flatMap((city, cityIndex) =>
    city.quartiers.map((quartier, quartierIndex) => ({
      key: `${slugify(city.ville)}-${slugify(quartier)}-${quartierIndex + 1}`,
      nom: `${city.ville} ${quartier} Medical Center`,
      adresse: `${quartier}, ${city.ville}`,
      ville: city.ville,
      quartier,
      latitude: (Number(city.latitude) + cityIndex * 0.002 + quartierIndex * 0.001).toFixed(6),
      longitude: (Number(city.longitude) - cityIndex * 0.002 - quartierIndex * 0.001).toFixed(6),
      phone: buildPhone('5', cityIndex * 10 + quartierIndex + 20),
      photos: [
        cabinetPhotoPool[(cityIndex + quartierIndex) % cabinetPhotoPool.length],
        cabinetPhotoPool[(cityIndex + quartierIndex + 1) % cabinetPhotoPool.length],
      ],
    }))
  );

const buildExtraDoctorSeeds = (generatedCabinets) => {
  const cabinetsByCity = generatedCabinets.reduce((accumulator, cabinet) => {
    const current = accumulator.get(cabinet.ville) || [];
    current.push(cabinet.key);
    accumulator.set(cabinet.ville, current);
    return accumulator;
  }, new Map());

  return doctorFirstNames.flatMap((firstName, firstIndex) =>
    doctorLastNames.map((lastName, lastIndex) => {
      const index = firstIndex * doctorLastNames.length + lastIndex;
      const template = doctorSpecialtyTemplates[index % doctorSpecialtyTemplates.length];
      const city = extraCityCatalog[Math.floor(index / 2) % extraCityCatalog.length];
      const cabinetKeys = cabinetsByCity.get(city.ville) || [];

      return {
        key: `extra-doctor-${index + 1}`,
        email: `dr.${slugify(firstName)}.${slugify(lastName)}@tabibconnect.ma`,
        phone: buildPhone('6', index + 1),
        nomComplet: `Dr ${firstName} ${lastName}`,
        inpe: `INPE-2026-${String(1000 + index).padStart(4, '0')}`,
        specialite: template.specialite,
        diplomes: [...template.diplomes, `Formation continue - ${city.ville}`],
        languesParlees: template.languesParlees,
        tarifConsultation: template.tarifConsultation,
        accepteAssurance: template.accepteAssurance,
        assurancesAcceptees: template.assurancesAcceptees,
        bio: `${template.bio} Cabinet actif a ${city.ville}.`,
        experience: template.experience + (index % 3),
        cabinetKeys: cabinetKeys.slice(0, 2),
        document: {
          fileName: `dr-${slugify(firstName)}-${slugify(lastName)}-diplome.pdf`,
          filePath: `uploads/documents/dr-${slugify(firstName)}-${slugify(lastName)}-diplome.pdf`,
          mimeType: 'application/pdf',
          size: 210000 + index * 431,
        },
        availabilitySeeds: template.availabilitySeeds.map((slot, slotIndex) => ({
          key: `extra-doctor-${index + 1}-${slot.jourSemaine.toLowerCase()}-${slotIndex + 1}`,
          cabinetKey: cabinetKeys[slotIndex % cabinetKeys.length],
          jourSemaine: slot.jourSemaine,
          heureDebut: slot.heureDebut,
          heureFin: slot.heureFin,
          dureeConsultation: slot.dureeConsultation,
        })),
        motifs: template.motifs,
        reviews: template.reviews,
      };
    })
  );
};

const buildExtraAppointmentSeeds = () => {
  const activePatients = patientSeeds;
  const activeDoctors = doctorSeeds;
  const appointmentStatuses = ['COMPLETE', 'CONFIRME', 'EN_ATTENTE', 'ANNULE', 'NO_SHOW'];
  const consultationTypes = ['PRESENTIEL', 'TELECONSULTATION'];
  const baseDate = new Date('2026-04-28T08:00:00.000Z');

  return Array.from({ length: 220 }, (_, index) => {
    const patient = activePatients[index % activePatients.length];
    const doctor = activeDoctors[index % activeDoctors.length];
    const template = doctorSpecialtyTemplates[index % doctorSpecialtyTemplates.length];
    const availability = doctor.availabilitySeeds[index % doctor.availabilitySeeds.length];
    const status = appointmentStatuses[index % appointmentStatuses.length];
    const dateHeure = buildIsoDate(baseDate, index - 12, index % 5);
    const cancellationRole = index % 2 === 0 ? 'PATIENT' : 'DOCTOR';

    return {
      key: `extra-rdv-${index + 1}`,
      patientKey: patient.key,
      doctorKey: doctor.key,
      cabinetKey: availability.cabinetKey,
      availabilityKey: availability.key,
      statut: status,
      methodePaiement: consultationTypes[index % consultationTypes.length] === 'TELECONSULTATION' ? 'CMI' : ['CASH', 'CMI', 'VIREMENT'][index % 3],
      acceptedGeneralTerms: true,
      acceptedCashPolicy: consultationTypes[index % consultationTypes.length] === 'PRESENTIEL',
      motif: `${template.motifs[index % template.motifs.length]} - dossier ${index + 1}`,
      typeConsultation: consultationTypes[index % consultationTypes.length],
      notes: `Suivi enrichi pour ${doctor.nomComplet || doctor.email || 'ce dossier'}.`,
      cancellationReason: status === 'ANNULE' ? 'Report de rendez-vous par le patient' : undefined,
      cancelledAt: status === 'ANNULE' ? buildIsoDate(baseDate, index - 8, 10) : undefined,
      cancelledByRole: status === 'ANNULE' ? cancellationRole : undefined,
      confirmedAt: status === 'CONFIRME' || status === 'COMPLETE' ? buildIsoDate(baseDate, index - 13, 1) : undefined,
      completedAt: status === 'COMPLETE' ? buildIsoDate(baseDate, index - 12, 2) : undefined,
      noShowAt: status === 'NO_SHOW' ? buildIsoDate(baseDate, index - 11, 3) : undefined,
      rappelEnvoye: status === 'COMPLETE' || status === 'CONFIRME' || status === 'NO_SHOW',
      dateHeure,
    };
  });
};

const buildExtraReviewSeeds = () => {
  const alreadyReviewedKeys = new Set(reviewSeeds.map((review) => review.rendezVousKey));
  const completedAppointments = appointmentSeeds.filter(
    (appointment) => appointment.statut === 'COMPLETE' && !alreadyReviewedKeys.has(appointment.key)
  );
  const reviewNotes = [5, 5, 4, 5, 4, 5, 5, 4, 5, 4, 5, 5, 4, 5, 5, 4, 5, 4];

  return completedAppointments.slice(0, 60).map((appointment, index) => {
    const doctor = doctorSeeds.find((item) => item.key === appointment.doctorKey);
    const template = doctorSpecialtyTemplates[index % doctorSpecialtyTemplates.length];

    return {
      key: `extra-avis-${index + 1}`,
      patientKey: appointment.patientKey,
      doctorKey: appointment.doctorKey,
      rendezVousKey: appointment.key,
      note: reviewNotes[index % reviewNotes.length],
      commentaire: template.reviews[index % template.reviews.length],
      isVerified: index % 3 !== 0,
      doctorLabel: doctor?.nomComplet || appointment.doctorKey,
    };
  });
};

const buildExtraNotificationSeeds = () => {
  const extraNotifications = [];
  const activePatients = patientSeeds;
  const activeDoctors = doctorSeeds;
  const relevantAppointments = appointmentSeeds.slice(0, 120);

  relevantAppointments.forEach((appointment, index) => {
    const patient = activePatients.find((item) => item.key === appointment.patientKey) || activePatients[index % activePatients.length];
    const doctor = activeDoctors.find((item) => item.key === appointment.doctorKey) || activeDoctors[index % activeDoctors.length];

    const patientType =
      appointment.statut === 'ANNULE'
        ? 'RDV_ANNULE'
        : appointment.statut === 'COMPLETE'
          ? 'PAIEMENT_RECU'
          : appointment.statut === 'NO_SHOW'
            ? 'RAPPEL_RDV'
            : 'RAPPEL_RDV';

    const doctorType = appointment.statut === 'ANNULE' ? 'RDV_ANNULE' : 'SYSTEME';

    extraNotifications.push({
      key: `extra-notif-patient-${index + 1}`,
      userKey: patient.key,
      type: patientType,
      message:
        appointment.statut === 'ANNULE'
          ? `Votre rendez-vous ${appointment.motif.toLowerCase()} a ete reporte.`
          : appointment.statut === 'COMPLETE'
            ? `Votre consultation avec ${doctor.nomComplet || 'le medecin'} est terminee.`
            : `Votre rendez-vous avec ${doctor.nomComplet || 'le medecin'} approche.`,
      isRead: index % 4 === 0,
    });

    extraNotifications.push({
      key: `extra-notif-doctor-${index + 1}`,
      userKey: doctor.key,
      type: doctorType,
      message:
        appointment.statut === 'COMPLETE'
          ? `Consultation finale enregistree pour ${patient.email}.`
          : appointment.statut === 'ANNULE'
            ? `Rendez-vous annule pour ${patient.email}.`
            : `Nouveau suivi programme avec ${patient.email}.`,
      isRead: index % 5 === 0,
    });
  });

  extraNotifications.push({
    key: 'extra-notif-admin-enrichi',
    userKey: adminSeed.key,
    type: 'SYSTEME',
    message: 'La plateforme a recu un lot massif de donnees pour simuler une forte activite.',
    isRead: true,
  });

  return extraNotifications;
};

const buildExtraPaymentSeeds = () => {
  const existingPaymentKeys = new Set(paymentSeeds.map((payment) => payment.rendezVousKey));
  const payableAppointments = appointmentSeeds.filter(
    (appointment) =>
      (appointment.statut === 'COMPLETE' || appointment.statut === 'CONFIRME') &&
      !existingPaymentKeys.has(appointment.key)
  );
  const paymentMethods = ['CASH', 'CMI', 'VIREMENT'];

  return payableAppointments.slice(0, 60).map((appointment, index) => {
    const doctor = doctorSeeds.find((item) => item.key === appointment.doctorKey);
    const status = index % 7 === 0 ? 'EN_ATTENTE' : index % 11 === 0 ? 'REMBOURSE' : 'PAYE';
    const amount = doctor?.tarifConsultation || '300.00';

    return {
      key: `extra-payment-${index + 1}`,
      rendezVousKey: appointment.key,
      doctorKey: appointment.doctorKey,
      montant: amount,
      methode: paymentMethods[index % paymentMethods.length],
      statut: status,
      reference: `PAY-TC-2026-${String(2000 + index).padStart(4, '0')}`,
    };
  });
};

const buildExtraPatientDocumentSeeds = () =>
  patientSeeds.map((patient, index) => {
    const profilePhotoPath = pickFromPool(profilePhotoPool, index);
    const photoMeta = getSeedFileMeta(profilePhotoPath);

    return {
      key: `patient-photo-${index + 1}`,
      patientKey: patient.key,
      ...photoMeta,
      isProfilePhoto: true,
    };
  });

const buildExtraDoctorProfilePhotoSeeds = () =>
  doctorSeeds.map((doctor, index) => {
    const profilePhotoPath = pickFromPool(profilePhotoPool, index + 3);
    const photoMeta = getSeedFileMeta(profilePhotoPath);

    return {
      key: `doctor-photo-${index + 1}`,
      doctorKey: doctor.key,
      ...photoMeta,
      isProfilePhoto: true,
    };
  });

const buildExtraPatientChangeRequestSeeds = () => {
  const statuses = ['PENDING', 'APPROVED', 'REJECTED'];

  return patientSeeds.slice(0, 30).map((patient, index) => {
    const status = statuses[index % statuses.length];
    return {
      key: `patient-change-${index + 1}`,
      patientKey: patient.key,
      status,
      reason: index % 2 === 0 ? 'Mise a jour de l adresse et de la ville' : 'Correction du groupe sanguin et des antecedents',
      payload: {
        adresse: `${patient.ville} - Residence ${index + 1}`,
        ville: patient.ville,
        groupeSanguin: patient.groupeSanguin,
        antecedents: `${patient.antecedents || 'Aucun antecedent'} (validation dossier ${index + 1})`,
      },
      reviewNote: status === 'REJECTED' ? 'Piece justificative insuffisante' : status === 'APPROVED' ? 'Infos valides' : null,
      reviewedByUserKey: status === 'PENDING' ? null : adminSeed.key,
    };
  });
};

const buildExtraDoctorChangeRequestSeeds = () => {
  const statuses = ['PENDING', 'APPROVED', 'REJECTED'];

  return doctorSeeds.slice(0, 36).map((doctor, index) => {
    const status = statuses[(index + 1) % statuses.length];
    const template = doctorSpecialtyTemplates[index % doctorSpecialtyTemplates.length];

    return {
      key: `doctor-change-${index + 1}`,
      doctorKey: doctor.key,
      type: index % 2 === 0 ? 'PROFILE_UPDATE' : 'LOCATION_UPDATE',
      status,
      reason: index % 2 === 0 ? 'Mise a jour du profil medical' : 'Ajout ou correction du cabinet',
      payload: index % 2 === 0
        ? {
            nomComplet: doctor.nomComplet,
            specialite: doctor.specialite,
            tarifConsultation: String(doctor.tarifConsultation),
            experience: doctor.experience,
            languesParlees: doctor.languesParlees,
            diplomes: doctor.diplomes,
            accepteAssurance: doctor.accepteAssurance,
            assurancesAcceptees: doctor.assurancesAcceptees,
            bio: `${doctor.bio || template.bio} (mise a jour ${index + 1})`,
          }
        : {
            nom: `${doctor.nomComplet} Cabinet ${index + 1}`,
            ville: extraCityCatalog[index % extraCityCatalog.length].ville,
            adresse: `${extraCityCatalog[index % extraCityCatalog.length].quartiers[0]}, ${extraCityCatalog[index % extraCityCatalog.length].ville}`,
            quartier: extraCityCatalog[index % extraCityCatalog.length].quartiers[0],
            latitude: extraCityCatalog[index % extraCityCatalog.length].latitude,
            longitude: extraCityCatalog[index % extraCityCatalog.length].longitude,
          },
      reviewNote: status === 'REJECTED' ? 'Documents complementaires requis' : status === 'APPROVED' ? 'Validation complete' : null,
      reviewedByUserKey: status === 'PENDING' ? null : adminSeed.key,
    };
  });
};

const buildExtraDoctorPatientNoteSeeds = () => {
  const completedAppointments = appointmentSeeds.filter((appointment) => appointment.statut === 'COMPLETE');

  return completedAppointments.slice(0, 60).map((appointment, index) => {
    const doctor = doctorSeeds.find((item) => item.key === appointment.doctorKey);
    const patient = patientSeeds.find((item) => item.key === appointment.patientKey);

    return {
      key: `doctor-patient-note-${index + 1}`,
      doctorKey: appointment.doctorKey,
      patientKey: appointment.patientKey,
      rendezVousKey: appointment.key,
      note: `Suivi clinique: ${patient?.ville || 'Maroc'} - ${doctor?.specialite || 'consultation generale'} - dossier ${index + 1}`,
      isVisibleToPeers: index % 3 === 0,
    };
  });
};

patientSeeds.push(...buildExtraPatientSeeds());
const extraCabinets = buildExtraCabinetSeeds();
cabinetSeeds.push(...extraCabinets);
doctorSeeds.push(...buildExtraDoctorSeeds(extraCabinets));
appointmentSeeds.push(...buildExtraAppointmentSeeds());
reviewSeeds.push(...buildExtraReviewSeeds());
notificationSeeds.push(...buildExtraNotificationSeeds());
paymentSeeds.push(...buildExtraPaymentSeeds());

const toDate = (value) => new Date(value);

const maybeDate = (value) => (value ? toDate(value) : undefined);

const createRows = async (items, createRow) => {
  const rows = [];

  for (const [index, item] of items.entries()) {
    rows.push(await createRow(item, index));
  }

  return rows;
};

const mapByKey = (rows) => new Map(rows.map((row) => [row.key, row]));

async function main() {
  const passwordHash = await bcrypt.hash(passwordPlain, 12);

  await prisma.paiement.deleteMany();
  await prisma.avis.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.doctorPatientNote.deleteMany();
  await prisma.patientChangeRequest.deleteMany();
  await prisma.doctorChangeRequest.deleteMany();
  await prisma.rendezVous.deleteMany();
  await prisma.disponibilite.deleteMany();
  await prisma.doctorCabinet.deleteMany();
  await prisma.doctorDocument.deleteMany();
  await prisma.patientDocument.deleteMany();
  await prisma.cabinet.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.user.deleteMany();

  const createdUsers = new Map();

  const adminUser = await prisma.user.create({
    data: {
      email: adminSeed.email,
      password: passwordHash,
      phone: adminSeed.phone,
      role: 'ADMIN',
      isVerified: true,
    },
  });
  createdUsers.set(adminSeed.key, adminUser);

  const patientUsers = await createRows(patientSeeds, async (seed) => {
    const user = await prisma.user.create({
      data: {
        email: seed.email,
        password: passwordHash,
        phone: seed.phone,
        role: 'PATIENT',
        isVerified: true,
      },
    });

    return { key: seed.key, ...user };
  });

  const doctorUsers = await createRows(doctorSeeds, async (seed) => {
    const user = await prisma.user.create({
      data: {
        email: seed.email,
        password: passwordHash,
        phone: seed.phone,
        role: 'DOCTOR',
        isVerified: true,
      },
    });

    return { key: seed.key, ...user };
  });

  patientUsers.forEach((user) => createdUsers.set(user.key, user));
  doctorUsers.forEach((user) => createdUsers.set(user.key, user));

  const patients = await createRows(patientSeeds, async (seed, index) => {
    const cinMeta = getSeedFileMeta(pickFromPool(patientCinPhotoPool, index));
    const patient = await prisma.patient.create({
      data: {
        userId: createdUsers.get(seed.key).id,
        cin: seed.cin,
        dateOfNaissance: toDate(seed.dateOfNaissance),
        sexe: seed.sexe,
        adresse: seed.adresse,
        ville: seed.ville,
        groupeSanguin: seed.groupeSanguin,
        antecedents: seed.antecedents,
        cinDocumentFileName: cinMeta.fileName,
        cinDocumentFilePath: cinMeta.filePath,
        cinDocumentMimeType: cinMeta.mimeType,
        cinDocumentSize: cinMeta.size,
        cinDocumentUploadedAt: new Date(),
        cinDocumentVerificationStatus: 'VERIFIED',
        cinDocumentVerificationScore: 95 - (index % 5),
        cinDocumentVerificationNote: 'CIN marocain valide et conforme',
        cinDocumentVerifiedAt: new Date(),
      },
    });

    return { key: seed.key, ...patient };
  });

  const doctors = await createRows(doctorSeeds, async (seed, index) => {
    const cinMeta = getSeedFileMeta(pickFromPool(patientCinPhotoPool, index + 1));
    const doctor = await prisma.doctor.create({
      data: {
        userId: createdUsers.get(seed.key).id,
        nomComplet: seed.nomComplet,
        inpe: seed.inpe,
        specialite: seed.specialite,
        diplomes: seed.diplomes,
        languesParlees: seed.languesParlees,
        tarifConsultation: new Prisma.Decimal(seed.tarifConsultation),
        accepteAssurance: seed.accepteAssurance,
        assurancesAcceptees: seed.assurancesAcceptees,
        bio: seed.bio,
        experience: seed.experience,
        cinDocumentFileName: cinMeta.fileName,
        cinDocumentFilePath: cinMeta.filePath,
        cinDocumentMimeType: cinMeta.mimeType,
        cinDocumentSize: cinMeta.size,
        cinDocumentUploadedAt: new Date(),
        cinDocumentVerificationStatus: 'VERIFIED',
        cinDocumentVerificationScore: 96 - (index % 4),
        cinDocumentVerificationNote: 'CIN professionnel marocain valide',
        cinDocumentVerifiedAt: new Date(),
      },
    });

    return { key: seed.key, ...doctor };
  });

  const cabinetRows = await createRows(cabinetSeeds, async (seed) => {
    const cabinet = await prisma.cabinet.create({
      data: {
        nom: seed.nom,
        adresse: seed.adresse,
        ville: seed.ville,
        quartier: seed.quartier,
        latitude: new Prisma.Decimal(seed.latitude),
        longitude: new Prisma.Decimal(seed.longitude),
        phone: seed.phone,
        photos: seed.photos,
      },
    });

    return { key: seed.key, ...cabinet };
  });

  const patientByKey = mapByKey(patients);
  const doctorByKey = mapByKey(doctors);
  const cabinetByKey = mapByKey(cabinetRows);

  await createRows(doctorSeeds.flatMap((doctorSeed) => doctorSeed.cabinetKeys.map((cabinetKey) => ({
    doctorKey: doctorSeed.key,
    cabinetKey,
  }))), async (pair) => {
    const relation = await prisma.doctorCabinet.create({
      data: {
        doctorId: doctorByKey.get(pair.doctorKey).id,
        cabinetId: cabinetByKey.get(pair.cabinetKey).id,
      },
    });

    return relation;
  });

  const availabilityRows = await createRows(
    doctorSeeds.flatMap((doctorSeed) =>
      doctorSeed.availabilitySeeds.map((availabilitySeed) => ({
        ...availabilitySeed,
        doctorKey: doctorSeed.key,
      }))
    ),
    async (seed) => {
      const availability = await prisma.disponibilite.create({
        data: {
          doctorId: doctorByKey.get(seed.doctorKey).id,
          cabinetId: cabinetByKey.get(seed.cabinetKey).id,
          jourSemaine: seed.jourSemaine,
          heureDebut: seed.heureDebut,
          heureFin: seed.heureFin,
          dureeConsultation: seed.dureeConsultation,
          isActive: true,
        },
      });

      return { key: seed.key, ...availability };
    }
  );

  const availabilityByKey = mapByKey(availabilityRows);

  await createRows(
    doctorSeeds.map((seed) => ({
      doctorKey: seed.key,
      ...seed.document,
    })),
    async (seed) => {
      const document = await prisma.doctorDocument.create({
        data: {
          doctorId: doctorByKey.get(seed.doctorKey).id,
          fileName: seed.fileName,
          filePath: seed.filePath,
          mimeType: seed.mimeType,
          size: seed.size,
        },
      });

      return { key: `${seed.doctorKey}-${seed.fileName}`, ...document };
    }
  );

  await createRows(buildExtraPatientDocumentSeeds(), async (seed) => {
    const document = await prisma.patientDocument.create({
      data: {
        patientId: patientByKey.get(seed.patientKey).id,
        fileName: seed.fileName,
        filePath: seed.filePath,
        mimeType: seed.mimeType,
        size: seed.size,
        isProfilePhoto: seed.isProfilePhoto,
      },
    });

    return { key: seed.key, ...document };
  });

  await createRows(buildExtraDoctorProfilePhotoSeeds(), async (seed) => {
    const document = await prisma.doctorDocument.create({
      data: {
        doctorId: doctorByKey.get(seed.doctorKey).id,
        fileName: seed.fileName,
        filePath: seed.filePath,
        mimeType: seed.mimeType,
        size: seed.size,
        isProfilePhoto: seed.isProfilePhoto,
      },
    });

    return { key: seed.key, ...document };
  });

  await createRows(buildExtraPatientChangeRequestSeeds(), async (seed) => {
    const request = await prisma.patientChangeRequest.create({
      data: {
        patientId: patientByKey.get(seed.patientKey).id,
        status: seed.status,
        reason: seed.reason,
        payload: seed.payload,
        reviewNote: seed.reviewNote,
        reviewedByUserId: seed.reviewedByUserKey ? createdUsers.get(seed.reviewedByUserKey).id : null,
        reviewedAt: seed.reviewedByUserKey ? new Date() : null,
      },
    });

    return { key: seed.key, ...request };
  });

  await createRows(buildExtraDoctorChangeRequestSeeds(), async (seed) => {
    const request = await prisma.doctorChangeRequest.create({
      data: {
        doctorId: doctorByKey.get(seed.doctorKey).id,
        type: seed.type,
        status: seed.status,
        reason: seed.reason,
        payload: seed.payload,
        reviewNote: seed.reviewNote,
        reviewedByUserId: seed.reviewedByUserKey ? createdUsers.get(seed.reviewedByUserKey).id : null,
        reviewedAt: seed.reviewedByUserKey ? new Date() : null,
      },
    });

    return { key: seed.key, ...request };
  });

  const rendezVousRows = await createRows(appointmentSeeds, async (seed) => {
    const appointment = await prisma.rendezVous.create({
      data: {
        patientId: patientByKey.get(seed.patientKey).id,
        doctorId: doctorByKey.get(seed.doctorKey).id,
        cabinetId: cabinetByKey.get(seed.cabinetKey).id,
        disponibiliteId: availabilityByKey.get(seed.availabilityKey).id,
        statut: seed.statut,
        methodePaiement: seed.methodePaiement || 'CASH',
        acceptedGeneralTerms: seed.acceptedGeneralTerms ?? true,
        acceptedCashPolicy: seed.acceptedCashPolicy ?? (seed.typeConsultation === 'PRESENTIEL'),
        motif: seed.motif,
        typeConsultation: seed.typeConsultation,
        notes: seed.notes,
        cancellationReason: seed.cancellationReason,
        cancelledAt: maybeDate(seed.cancelledAt),
        cancelledByRole: seed.cancelledByRole,
        confirmedAt: maybeDate(seed.confirmedAt),
        completedAt: maybeDate(seed.completedAt),
        noShowAt: maybeDate(seed.noShowAt),
        rappelEnvoye: seed.rappelEnvoye,
        dateHeure: toDate(seed.dateHeure),
      },
    });

    return { key: seed.key, ...appointment };
  });

  const rendezVousByKey = mapByKey(rendezVousRows);

  await createRows(buildExtraDoctorPatientNoteSeeds(), async (seed) => {
    const note = await prisma.doctorPatientNote.create({
      data: {
        doctorId: doctorByKey.get(seed.doctorKey).id,
        patientId: patientByKey.get(seed.patientKey).id,
        rendezVousId: rendezVousByKey.get(seed.rendezVousKey).id,
        note: seed.note,
        isVisibleToPeers: seed.isVisibleToPeers,
      },
    });

    return { key: seed.key, ...note };
  });

  await createRows(reviewSeeds, async (seed) => {
    const review = await prisma.avis.create({
      data: {
        patientId: patientByKey.get(seed.patientKey).id,
        doctorId: doctorByKey.get(seed.doctorKey).id,
        rendezVousId: rendezVousByKey.get(seed.rendezVousKey).id,
        note: seed.note,
        commentaire: seed.commentaire,
        isVerified: seed.isVerified,
      },
    });

    return { key: seed.key, ...review };
  });

  await prisma.notification.createMany({
    data: notificationSeeds.map((seed) => ({
      type: seed.type,
      message: seed.message,
      isRead: seed.isRead,
      userId: createdUsers.get(seed.userKey).id,
    })),
  });

  await prisma.paiement.createMany({
    data: paymentSeeds.map((seed) => ({
      rendezVousId: rendezVousByKey.get(seed.rendezVousKey).id,
      doctorId: doctorByKey.get(seed.doctorKey).id,
      montant: new Prisma.Decimal(seed.montant),
      methode: seed.methode,
      statut: seed.statut,
      reference: seed.reference,
    })),
  });

  console.log('Seed completed for TabibConnect with a rich Morocco dataset.');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
