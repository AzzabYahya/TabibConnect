import { Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import Button from '../ui/Button';

function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const isArabic = i18n.language === 'ar';

  const toggleLanguage = () => {
    i18n.changeLanguage(isArabic ? 'fr' : 'ar');
  };

  return (
    <Button variant="outline" size="sm" onClick={toggleLanguage} className="gap-2">
      <Globe size={16} />
      {isArabic ? 'FR' : 'AR'}
    </Button>
  );
}

export default LanguageSwitcher;
