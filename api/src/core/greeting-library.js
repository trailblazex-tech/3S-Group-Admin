/**
 * Ready-made greetings for the Event Greetings section: a template per
 * festival or school occasion (headline, message, suggested dates) and a
 * library of banners to go with them.
 *
 * The banners are built by scripts/greeting-library/build.py from public
 * domain (CC0) photos, plus a few drawn illustrations, and live in the media
 * bucket under library/greetings/. greeting-library.json is that script's
 * manifest: which banners exist, which theme each belongs to, and where the
 * photo came from.
 *
 * Messages say "{org}"; the admin swaps in the site's name, so the same
 * templates serve every website on the platform.
 */
import manifest from './greeting-library.json' with { type: 'json' };

export const LIBRARY_PREFIX = 'library/greetings';

/**
 * group:  where the template sits in the picker
 * theme:  which banners suit it (see sources.json)
 * on:     a fixed calendar day, as [month, day] - the date is prefilled
 * around: days shown before and after that day, as [before, after]
 * moving: the date changes every year (lunar calendar); the editor picks it
 */
const templates = [
  // National days
  { id: 'republic-day', group: 'National days', label: 'Republic Day', theme: 'republic', on: [1, 26], around: [1, 0], title: 'Happy Republic Day', message: 'On this Republic Day, {org} salutes the spirit of our Constitution and the ideals of justice, liberty and equality. Jai Hind!', alt: 'The Indian national flag flying against the sky' },
  { id: 'independence-day', group: 'National days', label: 'Independence Day', theme: 'republic', on: [8, 15], around: [1, 0], title: 'Happy Independence Day', message: '{org} wishes everyone a proud and happy Independence Day. Let us honour the freedom fighters and work together for a stronger India. Jai Hind!', alt: 'The Indian national flag flying against the sky' },
  { id: 'gandhi-jayanti', group: 'National days', label: 'Gandhi Jayanti', theme: 'gandhi', on: [10, 2], around: [0, 0], title: 'Gandhi Jayanti', message: 'Remembering Mahatma Gandhi on his birth anniversary. May his message of truth, non-violence and simple living guide us every day.', alt: 'A tribute to Mahatma Gandhi' },
  { id: 'teachers-day', group: 'National days', label: "Teachers' Day", theme: 'teachers', on: [9, 5], around: [0, 0], title: "Happy Teachers' Day", message: "A heartfelt thank you to every teacher at {org} for the patience, care and inspiration you bring to our students every single day.", alt: 'A classroom chalkboard' },
  { id: 'childrens-day', group: 'National days', label: "Children's Day", theme: 'children', on: [11, 14], around: [0, 0], title: "Happy Children's Day", message: "Every child is a spark of wonder. {org} wishes all our young learners a joyful Children's Day full of fun, curiosity and laughter.", alt: 'Colourful play balls at a children’s play area' },
  { id: 'hindi-diwas', group: 'National days', label: 'Hindi Diwas', theme: 'hindi', on: [9, 14], around: [0, 0], title: 'Hindi Diwas', message: 'On Hindi Diwas, {org} celebrates the beauty and richness of our national language. Let us read, write and speak it with pride.', alt: 'Rows of books on a shelf' },
  { id: 'womens-day', group: 'National days', label: "Women's Day", theme: 'women', on: [3, 8], around: [0, 0], title: "Happy Women's Day", message: "{org} celebrates the strength, wisdom and achievements of women everywhere - our teachers, mothers, staff and students.", alt: 'Women celebrating together' },
  { id: 'yoga-day', group: 'National days', label: 'International Yoga Day', theme: 'yoga', on: [6, 21], around: [0, 0], title: 'International Yoga Day', message: 'Yoga brings together body, mind and breath. {org} wishes everyone a healthy and peaceful International Yoga Day.', alt: 'A person doing yoga at sunrise' },
  { id: 'environment-day', group: 'National days', label: 'World Environment Day', theme: 'environment', on: [6, 5], around: [0, 0], title: 'World Environment Day', message: 'Plant a tree, save water, say no to plastic. {org} invites every family to take one small step for our planet today.', alt: 'A young plant growing' },

  // Festivals
  { id: 'new-year', group: 'Festivals', label: 'New Year', theme: 'newyear', on: [1, 1], around: [1, 1], title: 'Happy New Year', message: '{org} wishes you and your family a wonderful New Year ahead, filled with learning, growth and happiness.', alt: 'Colourful fireworks lighting up the night sky' },
  { id: 'lohri', group: 'Festivals', label: 'Lohri', theme: 'lohri', on: [1, 13], around: [0, 0], title: 'Happy Lohri', message: 'May the warmth of the Lohri bonfire fill your home with joy, prosperity and togetherness. Happy Lohri from {org}!', alt: 'A bright bonfire at night' },
  { id: 'makar-sankranti', group: 'Festivals', label: 'Makar Sankranti', theme: 'sankranti', on: [1, 14], around: [0, 0], title: 'Happy Makar Sankranti', message: 'As the kites rise high, may your dreams soar too. {org} wishes everyone a bright and happy Makar Sankranti.', alt: 'Colourful kites flying in a blue sky' },
  { id: 'basant-panchami', group: 'Festivals', label: 'Basant Panchami', theme: 'basant', moving: true, around: [0, 0], title: 'Happy Basant Panchami', message: 'May Maa Saraswati bless every student with wisdom, knowledge and creativity. Happy Basant Panchami from {org}.', alt: 'A field of yellow mustard flowers' },
  { id: 'maha-shivratri', group: 'Festivals', label: 'Maha Shivratri', theme: 'shivratri', moving: true, around: [0, 0], title: 'Happy Maha Shivratri', message: '{org} wishes everyone a peaceful and blessed Maha Shivratri. Om Namah Shivaya.', alt: 'A statue of Lord Shiva' },
  { id: 'holi', group: 'Festivals', label: 'Holi', theme: 'holi', moving: true, around: [1, 0], title: 'Happy Holi', message: 'May your life be filled with the colours of joy, friendship and love. {org} wishes everyone a safe and happy Holi!', alt: 'Hands full of bright Holi colours' },
  { id: 'baisakhi', group: 'Festivals', label: 'Baisakhi', theme: 'baisakhi', on: [4, 13], around: [0, 1], title: 'Happy Baisakhi', message: 'Celebrating the harvest and new beginnings. {org} wishes everyone a prosperous and joyful Baisakhi.', alt: 'A golden wheat field ready for harvest' },
  { id: 'eid', group: 'Festivals', label: 'Eid', theme: 'eid', moving: true, around: [0, 1], title: 'Eid Mubarak', message: 'May this Eid bring peace, happiness and prosperity to every home. Eid Mubarak from {org}!', alt: 'A crescent moon and glowing lanterns over a night skyline' },
  { id: 'raksha-bandhan', group: 'Festivals', label: 'Raksha Bandhan', theme: 'rakhi', moving: true, around: [0, 0], title: 'Happy Raksha Bandhan', message: 'Celebrating the beautiful bond between brothers and sisters. {org} wishes everyone a happy Raksha Bandhan.', alt: 'A decorative rakhi' },
  { id: 'janmashtami', group: 'Festivals', label: 'Janmashtami', theme: 'janmashtami', moving: true, around: [0, 0], title: 'Happy Janmashtami', message: 'May Lord Krishna fill your life with love, joy and wisdom. {org} wishes everyone a happy Janmashtami.', alt: 'A Janmashtami offering with marigold flowers' },
  { id: 'ganesh-chaturthi', group: 'Festivals', label: 'Ganesh Chaturthi', theme: 'ganesh', moving: true, around: [0, 0], title: 'Happy Ganesh Chaturthi', message: 'May Lord Ganesha remove every obstacle and bless you with wisdom and success. Ganpati Bappa Morya!', alt: 'An idol of Lord Ganesha' },
  { id: 'dussehra', group: 'Festivals', label: 'Dussehra', theme: 'dussehra', moving: true, around: [1, 1], title: 'Happy Dussehra', message: '{org} wishes everyone a Dussehra filled with the triumph of good over evil. May this Vijayadashami bring courage, wisdom and new beginnings.', alt: 'A traditional painting celebrating the victory of good over evil' },
  { id: 'diwali', group: 'Festivals', label: 'Diwali', theme: 'diwali', moving: true, around: [2, 1], title: 'Happy Diwali', message: '{org} wishes every student, parent and well-wisher a bright and joyful Diwali. May this festival of lights bring health, happiness and success to your home.', alt: 'Glowing diyas lit for Diwali' },
  { id: 'guru-nanak-jayanti', group: 'Festivals', label: 'Guru Nanak Jayanti', theme: 'gurpurab', moving: true, around: [0, 0], title: 'Happy Gurpurab', message: 'On the Prakash Purab of Guru Nanak Dev Ji, may his teachings of love, equality and service light up our lives.', alt: 'The Golden Temple lit up at night' },
  { id: 'christmas', group: 'Festivals', label: 'Christmas', theme: 'christmas', on: [12, 25], around: [1, 1], title: 'Merry Christmas', message: 'Wishing all our students and their families a Merry Christmas, filled with warmth, joy and togetherness.', alt: 'A Christmas tree decorated with red and gold baubles' },

  // School life
  { id: 'admissions-open', group: 'School announcements', label: 'Admissions open', theme: 'school', moving: true, around: [0, 60], title: 'Admissions Open', message: 'Registrations are now open at {org}. Visit the campus or speak with our admission team to know about classes, facilities and the admission process.', alt: 'A school building', cta: { label: 'Admission Details', href: '/admissions/guidelines' } },
  { id: 'new-session', group: 'School announcements', label: 'New session / welcome back', theme: 'school', moving: true, around: [0, 6], title: 'Welcome to the New Session', message: 'A warm welcome to all our students, old and new. {org} wishes everyone a wonderful year of learning ahead.', alt: 'A school building' },
  { id: 'annual-day', group: 'School announcements', label: 'Annual Day', theme: 'celebration', moving: true, around: [5, 0], title: 'Annual Day Celebration', message: 'Join us for the Annual Day of {org} - an evening of performances, prizes and pride. All parents are warmly invited.', alt: 'Confetti falling at a celebration' },
  { id: 'sports-day', group: 'School announcements', label: 'Sports Day', theme: 'sports', moving: true, around: [5, 0], title: 'Sports Day', message: 'Get ready to cheer! {org} invites all parents to our Sports Day - a celebration of teamwork, fitness and fair play.', alt: 'Lanes on a running track' },
  { id: 'exams', group: 'School announcements', label: 'Exams - best wishes', theme: 'exams', moving: true, around: [0, 7], title: 'All the Best for Your Exams', message: 'Stay calm, sleep well and believe in yourself. {org} wishes every student the very best for the examinations.', alt: 'A stack of books' },
  { id: 'results', group: 'School announcements', label: 'Results / congratulations', theme: 'celebration', moving: true, around: [0, 7], title: 'Congratulations to Our Achievers', message: '{org} is proud of every student for their hard work this year. Congratulations to all our achievers!', alt: 'Confetti falling at a celebration' },
  { id: 'summer-vacation', group: 'School announcements', label: 'Summer vacation', theme: 'summer', moving: true, around: [3, 0], title: 'Happy Summer Vacation', message: 'The school will remain closed for summer vacation. Stay safe, drink plenty of water, read a good book and enjoy the break!', alt: 'A sunny beach' },
  { id: 'winter-vacation', group: 'School announcements', label: 'Winter vacation', theme: 'winter', moving: true, around: [3, 0], title: 'Winter Vacation', message: 'The school will remain closed for winter vacation. Stay warm, stay healthy and have a restful break!', alt: 'A snowy landscape' },
  { id: 'celebration', group: 'School announcements', label: 'Any other celebration', theme: 'celebration', moving: true, around: [0, 2], title: 'Celebrations at School', message: 'Something special is happening at {org}! ', alt: 'Confetti falling at a celebration' },
];

/** Everything the admin's template and banner pickers need, with absolute URLs. */
export function greetingLibrary(mediaBaseUrl) {
  const base = `${String(mediaBaseUrl ?? '').replace(/\/$/, '')}/${LIBRARY_PREFIX}`;
  const banners = manifest.map((entry) => ({
    id: entry.id,
    theme: entry.theme,
    url: `${base}/${entry.id}.webp`,
    still: `${base}/${entry.id}-still.webp`,
    thumb: `${base}/${entry.id}-thumb.webp`,
    credit: entry.credit,
  }));
  const themes = new Set(banners.map((banner) => banner.theme));

  return {
    templates: templates.filter((template) => themes.has(template.theme)),
    banners,
  };
}

export { templates as greetingTemplates };
