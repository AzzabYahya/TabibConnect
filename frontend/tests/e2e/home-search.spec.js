import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', async (route) => {
    const requestUrl = new URL(route.request().url())
    const { pathname } = requestUrl

    if (pathname.endsWith('/doctors/search')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            suggestedSpecialties: ['Cardiologie'],
            results: [
              {
                id: 'doctor-1',
                nomComplet: 'Dr. Amina El Fassi',
                specialite: 'Cardiologie',
                user: {
                  email: 'amina@example.com',
                },
              },
            ],
          },
        }),
      })
      return
    }

    if (pathname === '/api/home/summary') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            stats: [
              { label: 'Medecins verifies', value: 12, suffix: '+' },
              { label: 'Patients inscrits', value: 120, suffix: '+' },
              { label: 'RDV enregistres', value: 340, suffix: '+' },
              { label: 'Avis publies', value: 28, suffix: '+' },
            ],
            specialties: [
              { label: 'Cardiologie', count: 3 },
              { label: 'Pediatrie', count: 2 },
            ],
            hotspots: [
              {
                ville: 'Casablanca',
                center: [33.5731, -7.5898],
                label: 'Cardiologie / Neurologie',
                doctorsCount: 5,
                cabinetsCount: 3,
              },
              {
                ville: 'Rabat',
                center: [34.0209, -6.8417],
                label: 'Pediatrie / Medecine generale',
                doctorsCount: 4,
                cabinetsCount: 2,
              },
            ],
            testimonials: [
              {
                name: 'Nadia B.',
                city: 'Casablanca',
                quote: 'J ai reserve en 3 minutes. Les horaires sont clairs et la confirmation arrive tout de suite.',
                doctorName: 'Dr. Amina El Fassi',
                specialty: 'Cardiologie',
              },
            ],
          },
        }),
      })
      return
    }

    if (pathname === '/api/doctors') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 'doctor-1',
              nomComplet: 'Dr. Amina El Fassi',
              specialite: 'Cardiologie',
              ville: 'Casablanca',
              tarifConsultation: 300,
              experience: 12,
              accepteAssurance: true,
              user: {
                email: 'amina@example.com',
              },
              rating: {
                average: 4.9,
              },
              avisCount: 128,
            },
          ],
        }),
      })
      return
    }

    if (/\/api\/doctors\/[^/]+\/availabilities$/.test(pathname)) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            availabilities: [
              {
                disponibiliteId: 'dispo-1',
                cabinet: {
                  id: 'cab-1',
                  nom: 'Cabinet Hassan II',
                  ville: 'Casablanca',
                  quartier: 'Maarif',
                },
                slots: [
                  {
                    start: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                    end: new Date(Date.now() + 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(),
                  },
                ],
              },
            ],
          },
        }),
      })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    })
  })
})

test('lets a patient search a doctor from the homepage', async ({ page }) => {
  await page.goto('/')

  await page.getByLabel('Symptome ou specialite').fill('Cardiologie')
  await page.getByLabel('Ville disponible').selectOption('Casablanca')
  await page.getByRole('button', { name: /rechercher un medecin/i }).click()

  await expect(page).toHaveURL(/\/search\?q=Cardiologie&ville=Casablanca/)
  await expect(page.getByRole('heading', { name: /recherche intelligente/i })).toBeVisible()
  await expect(page.getByText('Dr. Amina El Fassi')).toBeVisible()
})