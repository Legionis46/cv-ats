import { ParsedCV } from '@/types';

function regexParseFallback(text: string): ParsedCV {
  const emailMatch = text.match(/[\w.+-]+@[\w.-]+\.\w{2,}/);
  const phoneMatch = text.match(/(\+?\d[\d\s\-().]{7,}\d)/);
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const nameLine = lines[0] || 'İsim Bulunamadı';

  const skillKeywords = [
    'JavaScript','TypeScript','Python','Java','C#','C++','Go','Rust',
    'React','Vue','Angular','Next.js','Node.js','Express','Django','Flask',
    'SQL','MySQL','PostgreSQL','MongoDB','Redis','SQLite',
    'Docker','Kubernetes','AWS','Azure','GCP','Git','CI/CD',
    'HTML','CSS','Tailwind','Bootstrap','REST','GraphQL','API',
    'Machine Learning','Deep Learning','TensorFlow','PyTorch',
    'Excel','PowerPoint','Word','Figma','Photoshop',
    'Scrum','Agile','Jira','Linux','Windows',
  ];
  const foundSkills = skillKeywords.filter((skill) =>
    text.toLowerCase().includes(skill.toLowerCase())
  );

  const expMatch = text.match(/(\d+)\s*(?:yıl|year|yrs?)\s*(?:of\s*)?(?:experience|deneyim|tecrübe)/i);
  const experienceYears = expMatch ? parseInt(expMatch[1]) : 0;

  const uniKeywords = ['Üniversitesi','University','Üniversite','Fakültesi','Institute','Enstitüsü'];
  let university = '';
  for (const keyword of uniKeywords) {
    const uniMatch = text.match(new RegExp(`([\\w\\sğüşıöçĞÜŞİÖÇ]+${keyword})`, 'i'));
    if (uniMatch) { university = uniMatch[1].trim().slice(-60); break; }
  }

  const cityKeywords = ['İstanbul','Ankara','İzmir','Bursa','Antalya','Istanbul','London','Berlin','New York','Paris','Amsterdam'];
  let location = '';
  for (const city of cityKeywords) {
    if (text.includes(city)) { location = city; break; }
  }

  const langMap: Record<string, string> = {
    'İngilizce':'İngilizce','English':'İngilizce',
    'Türkçe':'Türkçe','Turkish':'Türkçe',
    'Almanca':'Almanca','German':'Almanca',
    'Fransızca':'Fransızca','French':'Fransızca',
    'İspanyolca':'İspanyolca','Spanish':'İspanyolca',
  };
  const languages = Object.entries(langMap)
    .filter(([key]) => text.includes(key))
    .map(([, lang]) => ({ language: lang, level: 'Belirtilmemiş' }))
    .filter((v, i, a) => a.findIndex((t) => t.language === v.language) === i);

  return {
    name: nameLine,
    email: emailMatch ? emailMatch[0] : '',
    phone: phoneMatch ? phoneMatch[0] : '',
    location,
    university,
    department: '',
    graduation_year: '',
    skills: foundSkills,
    experience_years: experienceYears,
    last_position: '',
    last_company: '',
    languages,
    summary: lines.slice(0, 3).join(' ').slice(0, 300),
  };
}

export async function parseCV(text: string): Promise<ParsedCV> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    console.log('[Parser] Gemini API key bulunamadı, regex parser kullanılıyor.');
    return regexParseFallback(text);
  }

  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `Aşağıdaki CV metnini analiz et ve YALNIZCA geçerli JSON döndür (markdown veya açıklama ekleme).

CV:
${text.substring(0, 8000)}

JSON formatı:
{
  "name": "Adayın tam adı",
  "email": "eposta veya boş string",
  "phone": "telefon veya boş string",
  "location": "şehir/ülke veya boş string",
  "university": "üniversite adı veya boş string",
  "department": "bölüm adı veya boş string",
  "graduation_year": "mezuniyet yılı veya boş string",
  "skills": ["beceri1","beceri2"],
  "experience_years": 0,
  "last_position": "son unvan veya boş string",
  "last_company": "son şirket veya boş string",
  "languages": [{"language":"dil","level":"seviye"}],
  "summary": "2-3 cümle özet"
}

Kural: Bilgi yoksa boş string veya boş dizi kullan. Sadece JSON döndür.`;

    const result = await model.generateContent(prompt);
    const responseText = result.response
      .text()
      .trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const parsed = JSON.parse(responseText) as ParsedCV;
    return {
      name: parsed.name || 'İsim Bulunamadı',
      email: parsed.email || '',
      phone: parsed.phone || '',
      location: parsed.location || '',
      university: parsed.university || '',
      department: parsed.department || '',
      graduation_year: parsed.graduation_year || '',
      skills: Array.isArray(parsed.skills) ? parsed.skills : [],
      experience_years: typeof parsed.experience_years === 'number' ? parsed.experience_years : 0,
      last_position: parsed.last_position || '',
      last_company: parsed.last_company || '',
      languages: Array.isArray(parsed.languages) ? parsed.languages : [],
      summary: parsed.summary || '',
    };
  } catch (error) {
    console.error('[Parser] Gemini hatası, regex fallback kullanılıyor:', error);
    return regexParseFallback(text);
  }
}
