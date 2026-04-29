import React from 'react'
import { render, screen } from '@testing-library/react'

import TeleconsultationVideoPanel from './TeleconsultationVideoPanel'

describe('TeleconsultationVideoPanel', () => {
  test('shows the session details and join link', () => {
    render(
      <TeleconsultationVideoPanel
        appointmentId="rdv-42"
        doctorName="Dr. Amina El Fassi"
        joinUrl="https://meet.example.com/session-42"
      />
    )

    expect(screen.getByText(/teleconsultation video/i)).toBeInTheDocument()
    expect(screen.getByText(/session avec Dr. Amina El Fassi/i)).toBeInTheDocument()
    expect(screen.getByText(/reference session: rdv-42/i)).toBeInTheDocument()

    expect(screen.getByRole('link', { name: /rejoindre la consultation/i })).toHaveAttribute(
      'href',
      'https://meet.example.com/session-42'
    )
  })
})