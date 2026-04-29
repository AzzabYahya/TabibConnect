import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  fr: {
    translation: {
      appName: 'TabibConnect',
      nav: {
        home: 'Accueil',
        search: 'Recherche',
        login: 'Connexion',
        register: 'Inscription',
        patientDashboard: 'Dashboard Patient',
        doctorDashboard: 'Dashboard Médecin',
        adminDashboard: 'Dashboard Admin',
      },
      home: {
        title: 'La santé marocaine, au rythme du digital',
        subtitle:
          'Prenez rendez-vous avec les meilleurs médecins du Maroc, en présentiel ou téléconsultation.',
        ctaPrimary: 'Trouver un médecin',
        ctaSecondary: 'Mon espace patient',
      },
      search: {
        title: 'Recherche intelligente',
        subtitle: 'Filtrez par spécialité et ville, puis visualisez les cabinets sur carte.',
      },
      auth: {
        loginTitle: 'Connexion securisee',
        registerTitle: 'Creer un compte patient',
      },
    },
  },
  ar: {
    translation: {
      appName: 'طبيب كونيكت',
      nav: {
        home: 'الرئيسية',
        search: 'البحث',
        login: 'تسجيل الدخول',
        register: 'إنشاء حساب',
        patientDashboard: 'لوحة المريض',
        doctorDashboard: 'لوحة الطبيب',
        adminDashboard: 'لوحة الإدارة',
      },
      home: {
        title: 'صحتك المغربية بأسلوب رقمي حديث',
        subtitle: 'احجز موعدك مع أفضل الأطباء في المغرب حضوريا أو عن بعد.',
        ctaPrimary: 'ابحث عن طبيب',
        ctaSecondary: 'مساحة المريض',
      },
      search: {
        title: 'بحث ذكي',
        subtitle: 'ابحث حسب التخصص والمدينة مع خريطة تفاعلية للعيادات.',
      },
      auth: {
        loginTitle: 'تسجيل دخول آمن',
        registerTitle: 'إنشاء حساب مريض',
      },
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'fr',
  fallbackLng: 'fr',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
