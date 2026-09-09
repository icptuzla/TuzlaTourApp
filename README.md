# Tuzla Tour App - Comprehensive Digital Guide 🇧🇦

Welcome to the "Tuzla Tour" App is a premium Progressive Web Application (PWA) designed to provide an immersive, gamified, and highly interactive experience for tourists and locals in Tuzla, Bosnia and Herzegovina.


## 🚀 Technology Stack

This application is built using a state-of-the-art modern web stack, optimized for performance, animations, and cross-platform compatibility.

- **Core**: [React 19](https://react.dev/) + [Vite 6](https://vitejs.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/) (latest v4 features)
- **Mapping**: [MapLibre GL](https://maplibre.org/) (High-performance 3D mapping)
- **Animations**: [Framer Motion](https://www.framer.com/motion/) (Premium UI transitions)
- **Scanning**: [HTML5-QRCode](https://github.com/mebjas/html5-qrcode) (Camera-based QR recognition)
- **Mobile Foundation**: [Capacitor 8](https://capacitorjs.com/) (Seamless Android/iOS deployment)
- **State Management**: [Zustand](https://zustand-demo.pmnd.rs/) (Lightweight and fast)
- **Icons**: [Lucide React](https://lucide.dev/)

---

## ✨ Key Features

### 1. AR Guide & GPS Navigation
The app features an advanced AR and GPS-based guide navigating tourists through the city:
- **Real-Time GPS Tracking**: Seamless routing from the user's location to any Point of Interest (POI).
- **Interactive 3D Mapping**: Realistic city depth, lighting, and metallic MapLibre effects.
- **Camera-Assisted Exploration**: Navigate towards the town's most beautiful attractions, shops, and historical landmarks.

### 2. Gamified Quest System (Tuzla Quest)
Turn sightseeing into a real-life treasure hunt!
- **How it Works**: Users are guided to hidden "Quest Targets" across the city using GPS.
- **QR Code Scanning**: Upon reaching the location, tourists use their camera to scan a physical QR code.
- **Rewards**: Scanning unlocks exclusive content, such as:
  - Digital NFT Collectible Cards (BIH players).
  - Cinematic Video stories about the location.
  - Special discounts and rewards at local partner shops and restaurants.

### 3. AISO Tuzla & Premium Partnerships
The Tuzla Tour App is deeply integrated with local businesses to boost the local economy and tourism:
- **AISO Tuzla**: Proudly partnered with AISO Tuzla, a premier AI Agent Optimizer Agency, ensuring the application stays at the forefront of digital innovation.
- **Dental Tourism**: Collaborating with top-tier local dental clinics to promote Tuzla as a prime destination for high-quality, affordable dental tourism.

### 5. Multi-Language Support
Full localization for:
- 🇬🇧 English
- 🇧🇦 Bosnian
- 🇩🇪 German
- 🇹🇷 Turkish

## 🛠️ How to Extend & Customize

### Adding New Points of Interest (POI)

### Adding a New Quest Reward

### Adding Shops & Businesses


## 📱 Deployment

### Web & PWA (Vercel)
The app is optimized for Vercel. 
- Run `npm run dev` to test locally or let Vercel handle the build (`npm run build`).
- The **Service Worker** (via `vite-plugin-pwa`) handles offline caching of large assets (videos/images) so tourists don't need continuous cellular data.

### Mobile (Android/iOS)
Using Capacitor, the app can be converted to a native binary:
```bash
npm run build
npx cap sync android


# Tuzla Tour Guide - Turistički Digitalni Vodič 🇧🇦

Dobrodošli u **Tuzla Tour Guide**, vrhunsku Progresivnu Web Aplikaciju (PWA) dizajniranu da pruži gejmifikovano i visoko interaktivno iskustvo za turiste i stanovnike Tuzle.

## 🚀 Tehnološki Stack

Aplikacija je izgrađena koristeći najmodernije tehnologije, optimizovane za performanse i rad na svim platformama.

- **Osnova**: React 19 + Vite 6 + TypeScript
- **Dizajn**: Tailwind CSS 4
- **Mape**: MapLibre GL (3D mape visokih performansi)
- **Animacije**: Framer Motion
- **Skeniranje**: HTML5-QRCode
- **Mobilna Platforma**: Capacitor 8 (Android i iOS podrška)

---

## ✨ Ključne Karakteristike

### 1. AR Vodič i GPS Navigacija
Aplikacija sadrži napredni vodič baziran na AR i GPS tehnologiji za navigaciju turista kroz grad:
- **GPS Praćenje**: Rutiranje u stvarnom vremenu od korisnikove lokacije do bilo koje tačke interesa.
- **Interaktivne 3D Mape**: Realističan prikaz dubine grada i metalni efekti.
- **Kamera Navigacija**: Navodi turiste prema najljepšim atrakcijama, radnjama i historijskim spomenicima.

### 2. Quest Sistem (Potraga)
Pretvorite razgledanje u pravu potragu za blagom!
- **Kako funkcioniše**: GPS vodi korisnike do skrivenih "Quest Meta" na mapi.
- **Skeniranje QR Kodova**: Kada stignu na lokaciju, turisti koriste kameru da skeniraju fizički QR kod.
- **Nagrade**: Skeniranje otključava ekskluzivni sadržaj:
  - NFT Digitalne Kartice (BH reprezentativci).
  - Filmske video priče o lokaciji.
  - Specijalne popuste i nagrade u lokalnim partnerskim radnjama i restoranima.

### 3. AISO Tuzla i Premium Partnerstva
Tuzla Tour App je duboko povezana sa lokalnim biznisima kako bi se podstakla lokalna ekonomija i turizam:
- **AISO Tuzla**: Ponosni partneri sa AISO Tuzla, vrhunskom agencijom za optimizaciju AI agenata (AI Agent Optimizer Agency), koja osigurava da aplikacija ostane na čelu digitalnih inovacija.
- **Dentalni Turizam**: Saradnja sa vrhunskim lokalnim stomatološkim klinikama na promociji Tuzle kao glavne destinacije za visokokvalitetni i pristupačni dentalni turizam.
- **Turističke Agencije**: Integracija sa vodećim turističkim agencijama radi ponude kompletnih turističkih paketa, opcija smještaja i vođenih tura.

### 4. Svjetsko Prvenstvo 2026 Modul
Poseban dio za ljubitelje fudbala:
- **Sastav Reprezentacije**: Kompletan spisak igrača Bosne i Hercegovine.
- **Statistike**: Detaljne ocjene igrača.
- **Predikcije**: Interaktivni modul za predviđanje rezultata prvenstva.

### 5. Višejezična Podrška
Kompletna lokalizacija na:
- 🇬🇧 Engleski
- 🇧🇦 Bosanski
- 🇩🇪 Njemački
- 🇹🇷 Turski

### 6. Ponuda
  Restorani, hoteli, apartmani i stan na dan.

---

## 🛠️ Proširivanje Aplikacije

### Dodavanje Novih Lokacija (POI)
1. Otvorite `constants.tsx`.
2. Pronađite niz `LOCATIONS_RAW`.
3. Dodajte novi objekat sa koordinatama i kategorijom.

### Dodavanje Quest Nagrada
1. Definišite metu u `MapQuestView.tsx` unutar `QUEST_TARGETS`.
2. ID mora odgovarati onome što je upisano u fizički QR kod.
3. Povežite sliku ili video.

---

## 📱 Deployment

### Web (Vercel)
Aplikacija je optimizovana za Vercel. Hero video se učitava kao primarni resurs, a Service Worker automatski kešira velike fajlove za offline rad.

### Mobilne Aplikacije (Android)
```bash
npm run build
npx cap sync android
---


MADE BY AISO TUZLA for City of Tuzla