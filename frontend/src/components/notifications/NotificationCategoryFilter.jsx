import { NOTIFICATION_CATEGORIES } from '../../lib/notifications';

function NotificationCategoryFilter({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {NOTIFICATION_CATEGORIES.map((category) => (
        <button
          key={category.value}
          type="button"
          onClick={() => onChange(category.value)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition ${
            value === category.value
              ? 'bg-med-primary text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          {category.label}
        </button>
      ))}
    </div>
  );
}

export default NotificationCategoryFilter;
