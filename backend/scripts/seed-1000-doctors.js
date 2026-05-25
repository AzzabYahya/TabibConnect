const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const CITIES = ['Casablanca', 'Rabat', 'Marrakech', 'Fès', 'Tanger', 'Agadir', 'Meknès', 'Oujda', 'Kénitra', 'Tétouan'];
const SPECIALTIES = [
  'Médecine générale',
  'Cardiologie',
  'Dermatologie',
  'Gynécologie',
  'Neurologie',
  'Orthopédie',
  'Ophtalmologie',
  'ORL',
  'Pédiatrie',
  'Pneumologie',
  'Psychiatrie',
  'Gastro-entérologie',
  'Urologie',
  'Endocrinologie'
];

const FIRST_NAMES = [
  'Mohamed', 'Ahmed', 'Youssef', 'Mustapha', 'Rachid', 'Hamza', 'Karim', 'Anass', 'Omar', 'Khalid',
  'Amine', 'Mehdi', 'Saad', 'Hassan', 'Ali', 'Fatima', 'Khadija', 'Aicha', 'Meryem', 'Sanaa',
  'Laila', 'Salma', 'Amal', 'Imane', 'Hajar', 'Yasmina', 'Nadia', 'Sara', 'Ghita', 'Zineb'
];

const LAST_NAMES = [
  'Alami', 'Berrada', 'El Fassi', 'Benjelloun', 'Chraibi', 'Alaoui', 'Tazi', 'Sennouni', 'Bennani',
  'Filali', 'Kabbaj', 'Mansouri', 'Tahiri', 'Belkhayat', 'Bennis', 'Amrani', 'El Idrissi', 'Sabri',
  'Jouahri', 'Kadiri'
];

const LANGUAGES = ['Darija', 'Arabe', 'Français', 'Anglais'];
const ASSURANCES = ['CNSS', 'CNOPS', 'AXA', 'Saham', 'Wafa Assurance'];

async function main() {
  console.log('--- STARTING 1000+ DOCTORS DATABASE FEEDING ---');

  // 1. Get password hash (so all users have 'TabibConnect@2026')
  const passwordHash = await bcrypt.hash('TabibConnect@2026', 10);

  // 2. Fetch or create a default Patient to link appointments and reviews
  let patient = await prisma.patient.findFirst();
  if (!patient) {
    console.log('Creating a fallback patient...');
    const user = await prisma.user.create({
      data: {
        email: 'patient.seed@tabibconnect.ma',
        phone: '+212600000000',
        password: passwordHash,
        role: 'PATIENT',
        isVerified: true,
      }
    });
    patient = await prisma.patient.create({
      data: {
        userId: user.id,
        cin: 'XX000000',
        dateOfNaissance: new Date('1990-01-01'),
        sexe: 'HOMME',
        adresse: 'Fallback Street',
        ville: 'Casablanca',
      }
    });
  }

  // 3. Create or Fetch Cabinets across various Moroccan cities with GPS coordinates
  console.log('Creating or fetching cabinets for each Moroccan city...');
  const cabinets = [];
  for (const city of CITIES) {
    // Generate 3 cabinets per city to distribute doctors
    for (let c = 1; c <= 3; c++) {
      const cabName = `Centre Médical ${city} - Cabinet ${c}`;
      let cabinet = await prisma.cabinet.findFirst({
        where: { nom: cabName }
      });

      if (!cabinet) {
        // Moroccan cities bounding box approximation
        const latBase = city === 'Casablanca' ? 33.5731 : city === 'Rabat' ? 34.0208 : city === 'Marrakech' ? 31.6295 : 34.0000;
        const lngBase = city === 'Casablanca' ? -7.5898 : city === 'Rabat' ? -6.8416 : city === 'Marrakech' ? -7.9811 : -5.0000;
        
        cabinet = await prisma.cabinet.create({
          data: {
            nom: cabName,
            adresse: `Rue des Cliniques, N° ${10 * c}, ${city}`,
            ville: city,
            quartier: `Quartier ${c}`,
            latitude: (latBase + (Math.random() - 0.5) * 0.05).toFixed(6),
            longitude: (lngBase + (Math.random() - 0.5) * 0.05).toFixed(6),
            phone: `+212522${Math.floor(100000 + Math.random() * 900000)}`,
            photos: [`https://images.tabibconnect.ma/cabinets/${city.toLowerCase()}-${c}.jpg`],
          }
        });
      }
      cabinets.push(cabinet);
    }
  }
  console.log(`Loaded ${cabinets.length} cabinets.`);

  // 4. Generate 1020 doctors (34 per firstname * lastname combination roughly)
  console.log('Generating 1050 premium doctor entries. This will take a few moments...');
  
  let docCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < 1050; i++) {
    const fName = FIRST_NAMES[i % FIRST_NAMES.length];
    const lName = LAST_NAMES[Math.floor(i / FIRST_NAMES.length) % LAST_NAMES.length];
    const suffix = i >= FIRST_NAMES.length * LAST_NAMES.length ? ` ${Math.floor(i / 600)}` : '';
    const fullName = `Dr ${fName} ${lName}${suffix}`;
    const email = `${fName.toLowerCase()}.${lName.toLowerCase()}${i}@tabibconnect.ma`;
    const phone = `+2126${Math.floor(10000000 + Math.random() * 90000000)}`;
    const inpe = `INPE-2026-${String(i + 10).padStart(4, '0')}`;

    // Skip if already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      skippedCount++;
      continue;
    }

    try {
      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          phone,
          password: passwordHash,
          role: 'DOCTOR',
          isVerified: true,
        }
      });

      // Speciality & City assignments
      const specialite = SPECIALTIES[i % SPECIALTIES.length];
      const city = CITIES[i % CITIES.length];
      
      // Select cabinets in that city
      const cityCabs = cabinets.filter(c => c.ville === city);
      const chosenCab = cityCabs[i % cityCabs.length];

      // Languages & Assurances
      const docLanguages = [LANGUAGES[0]]; // Always Darija
      if (Math.random() > 0.3) docLanguages.push(LANGUAGES[1]); // Arabe
      if (Math.random() > 0.2) docLanguages.push(LANGUAGES[2]); // Français
      if (Math.random() > 0.7) docLanguages.push(LANGUAGES[3]); // Anglais

      const docAssurances = [];
      if (Math.random() > 0.4) {
        docAssurances.push(ASSURANCES[0]);
        if (Math.random() > 0.5) docAssurances.push(ASSURANCES[2]);
      }

      // Create Doctor
      const doctor = await prisma.doctor.create({
        data: {
          userId: user.id,
          inpe,
          specialite,
          nomComplet: fullName,
          diplomes: [`Doctorat en Médecine - Faculté de ${city}`, `Spécialité en ${specialite}`],
          languesParlees: docLanguages,
          tarifConsultation: (150 + Math.floor(Math.random() * 5) * 50).toFixed(2),
          accepteAssurance: docAssurances.length > 0,
          assurancesAcceptees: docAssurances,
          bio: `Spécialiste de confiance dédié à fournir des soins d'excellence en ${specialite} à ${city}.`,
          experience: 5 + Math.floor(Math.random() * 20),
        }
      });

      // Create DoctorCabinet association
      await prisma.doctorCabinet.create({
        data: {
          doctorId: doctor.id,
          cabinetId: chosenCab.id,
        }
      });

      // Create Disponibilites (3 random days)
      const DAYS = ['LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI'];
      const docDays = [DAYS[i % DAYS.length], DAYS[(i + 2) % DAYS.length]];
      for (const day of docDays) {
        await prisma.disponibilite.create({
          data: {
            doctorId: doctor.id,
            cabinetId: chosenCab.id,
            jourSemaine: day,
            heureDebut: '09:00',
            heureFin: '13:00',
            dureeConsultation: 30,
            isActive: true,
          }
        });
      }

      // Create 1-2 positive reviews for this doctor
      const reviewCount = Math.random() > 0.3 ? 2 : 1;
      for (let r = 0; r < reviewCount; r++) {
        const rdv = await prisma.rendezVous.create({
          data: {
            patientId: patient.id,
            doctorId: doctor.id,
            cabinetId: chosenCab.id,
            statut: 'COMPLETE',
            motif: `Consultation de routine en ${specialite}`,
            typeConsultation: Math.random() > 0.5 ? 'TELECONSULTATION' : 'PRESENTIEL',
            dateHeure: new Date(),
          }
        });

        await prisma.avis.create({
          data: {
            patientId: patient.id,
            doctorId: doctor.id,
            rendezVousId: rdv.id,
            note: 4 + (r % 2), // 4 or 5 star ratings
            commentaire: `Excellent médecin, très professionnel et à l'écoute. Je recommande vivement!`,
            isVerified: true,
          }
        });
      }

      docCount++;
      if (docCount % 100 === 0) {
        console.log(`Generated ${docCount} doctors...`);
      }
    } catch (e) {
      console.warn(`Error generating doctor ${i}:`, e.message || e);
    }
  }

  console.log(`--- SEEDING COMPLETED SUCCESSFULY ---`);
  console.log(`Doctors created: ${docCount}`);
  console.log(`Doctors skipped: ${skippedCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
