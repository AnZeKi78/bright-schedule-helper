import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Locale = "ru" | "kk";

type Dict = Record<string, string>;

const ru: Dict = {
  "app.title": "Расписание",
  "app.tagline": "Платформа управления расписанием преподавателей",
  "nav.dashboard": "Главная",
  "nav.schedule": "Расписание",
  "nav.admin": "Администрирование",
  "nav.login": "Войти",
  "nav.logout": "Выйти",
  "header.today": "На сегодня",
  "header.lessons": "занятий",
  "header.nextAt": "Ближайшее в",
  "header.noLessonsToday": "Сегодня занятий нет",
  "theme.toggle": "Сменить тему",
  "lang.toggle": "Язык",
  "role.admin": "Администратор",
  "role.teacher": "Преподаватель",
  "login.title": "Вход в систему",
  "login.subtitle": "Выберите роль для демонстрации",
  "login.asAdmin": "Войти как администратор",
  "login.asTeacher": "Войти как преподаватель",
  "login.teacherName": "Имя преподавателя",
  "dashboard.greeting": "Здравствуйте",
  "dashboard.todayTitle": "Ваше расписание сегодня",
  "dashboard.uploadHint": "Создавайте расписание вручную или генерируйте предмет на учебный год с учётом праздников и практики",
  "dashboard.cta": "Перейти к расписанию",
  "schedule.title": "Расписание занятий",
  "schedule.add": "Добавить занятие",
  "schedule.createYear": "Создать расписание предмета",
  "schedule.edit": "Изменить",
  "schedule.delete": "Удалить",
  "schedule.confirmDelete": "Удалить это занятие?",
  "schedule.empty": "Нет занятий, соответствующих фильтрам",
  "schedule.chooseGroup": "Выберите группу",
  "filters.title": "Фильтры",
  "filters.teacher": "Преподаватель",
  "filters.subject": "Предмет",
  "filters.day": "День",
  "filters.group": "Группа",
  "filters.chooseGroup": "Выберите группу",
  "filters.all": "Все",
  "filters.reset": "Сбросить",
  "form.teacher": "Преподаватель",
  "form.subject": "Предмет",
  "form.day": "День недели",
  "form.date": "Дата",
  "form.time": "Время",
  "form.room": "Кабинет",
  "form.group": "Группа",
  "form.chooseGroup": "Выбрать группу",
  "form.save": "Сохранить",
  "form.cancel": "Отмена",
  "admin.title": "Управление пользователями",
  "admin.subtitle": "Назначайте роли и определяйте, какие предметы видит каждый преподаватель",
  "admin.user": "Пользователь",
  "admin.role": "Роль",
  "admin.subjects": "Доступные предметы",
  "admin.addUser": "Добавить пользователя",
  "admin.name": "ФИО",
  "table.teacher": "Преподаватель",
  "table.subject": "Предмет",
  "table.week": "Неделя",
  "table.noDate": "Без даты",
  "table.date": "Дата",
  "table.day": "День",
  "table.time": "Время",
  "table.duration": "Длительность",
  "table.room": "Кабинет",
  "table.group": "Группа",
  "table.actions": "Действия",
  "day.mon": "Понедельник",
  "day.tue": "Вторник",
  "day.wed": "Среда",
  "day.thu": "Четверг",
  "day.fri": "Пятница",
  "day.sat": "Суббота",
  "day.sun": "Воскресенье",
  "footer.note": "Демо-версия. Подключите ваш FastAPI к /api для реальных данных.",
};

const kk: Dict = {
  "app.title": "Кесте",
  "app.tagline": "Оқытушылар кестесін басқару платформасы",
  "nav.dashboard": "Басты бет",
  "nav.schedule": "Кесте",
  "nav.admin": "Әкімшілік",
  "nav.login": "Кіру",
  "nav.logout": "Шығу",
  "header.today": "Бүгінге",
  "header.lessons": "сабақ",
  "header.nextAt": "Келесі сағат",
  "header.noLessonsToday": "Бүгін сабақ жоқ",
  "theme.toggle": "Тақырыпты ауыстыру",
  "lang.toggle": "Тіл",
  "role.admin": "Әкімші",
  "role.teacher": "Оқытушы",
  "login.title": "Жүйеге кіру",
  "login.subtitle": "Демонстрация үшін рөл таңдаңыз",
  "login.asAdmin": "Әкімші ретінде кіру",
  "login.asTeacher": "Оқытушы ретінде кіру",
  "login.teacherName": "Оқытушының аты",
  "dashboard.greeting": "Сәлеметсіз бе",
  "dashboard.todayTitle": "Бүгінгі кестеңіз",
  "dashboard.uploadHint": "Кестені қолмен жасаңыз немесе мереке мен практика күндерін ескеріп оқу жылына пән жасаңыз",
  "dashboard.cta": "Кестеге өту",
  "schedule.title": "Сабақ кестесі",
  "schedule.add": "Сабақ қосу",
  "schedule.createYear": "Пән кестесін жасау",
  "schedule.edit": "Өзгерту",
  "schedule.delete": "Жою",
  "schedule.confirmDelete": "Бұл сабақты жою керек пе?",
  "schedule.empty": "Сүзгілерге сәйкес сабақ жоқ",
  "schedule.chooseGroup": "Топты таңдаңыз",
  "filters.title": "Сүзгілер",
  "filters.teacher": "Оқытушы",
  "filters.subject": "Пән",
  "filters.day": "Күн",
  "filters.group": "Топ",
  "filters.chooseGroup": "Топты таңдаңыз",
  "filters.all": "Барлығы",
  "filters.reset": "Тазарту",
  "form.teacher": "Оқытушы",
  "form.subject": "Пән",
  "form.day": "Аптаның күні",
  "form.date": "Күні",
  "form.time": "Уақыты",
  "form.room": "Кабинет",
  "form.group": "Топ",
  "form.chooseGroup": "Топ таңдау",
  "form.save": "Сақтау",
  "form.cancel": "Болдырмау",
  "admin.title": "Пайдаланушыларды басқару",
  "admin.subtitle": "Рөлдерді тағайындап, әр оқытушы қай пәндерді көретінін орнатыңыз",
  "admin.user": "Пайдаланушы",
  "admin.role": "Рөлі",
  "admin.subjects": "Қол жетімді пәндер",
  "admin.addUser": "Пайдаланушы қосу",
  "admin.name": "Аты-жөні",
  "table.teacher": "Оқытушы",
  "table.subject": "Пән",
  "table.week": "Апта",
  "table.noDate": "Күні жоқ",
  "table.date": "Күні",
  "table.day": "Күн",
  "table.time": "Уақыт",
  "table.duration": "Ұзақтығы",
  "table.room": "Кабинет",
  "table.group": "Топ",
  "table.actions": "Әрекеттер",
  "day.mon": "Дүйсенбі",
  "day.tue": "Сейсенбі",
  "day.wed": "Сәрсенбі",
  "day.thu": "Бейсенбі",
  "day.fri": "Жұма",
  "day.sat": "Сенбі",
  "day.sun": "Жексенбі",
  "footer.note": "Демо-нұсқа. Нақты деректер үшін FastAPI-ды /api-ге қосыңыз.",
};

const dicts: Record<Locale, Dict> = { ru, kk };

type Ctx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
};

const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("ru");

  useEffect(() => {
    const saved = typeof window !== "undefined" ? (localStorage.getItem("locale") as Locale | null) : null;
    if (saved === "ru" || saved === "kk") setLocaleState(saved);
  }, []);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    if (typeof window !== "undefined") localStorage.setItem("locale", l);
  };

  const t = (key: string) => dicts[locale][key] ?? key;

  return <I18nContext.Provider value={{ locale, setLocale, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

export const DAY_KEYS = ["day.mon", "day.tue", "day.wed", "day.thu", "day.fri", "day.sat", "day.sun"] as const;
