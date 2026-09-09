// src/utils/questPopupHtml.ts
import { Language } from '../types';
import { POI_COLORS, NFT_REWARD_IDS } from '../constants/questData';

export const generateQuestPopupHtml = (loc: any, lang: Language, isUnlocked: boolean, isQuest: boolean) => {
    const markerColor = POI_COLORS[loc.id as keyof typeof POI_COLORS] || '#cbd5e1';
    const previewImg = loc.image;
    const NFT_IPFS = 'https://bafybeibd5ee6pjvkhn3kuitcclb5zjqdwo23yvprfwsaabcctylesvspsi.ipfs.dweb.link?filename=kenan-alajbegovic.webp';
    const isNFTReward = NFT_REWARD_IDS.includes(loc.id);

    return `
    <div style="padding: 18px; font-family: 'Quicksand', sans-serif; background: #0f172a; color: white; border-radius: 24px; border: 2px solid ${markerColor}${isUnlocked ? '' : '33'}; box-shadow: 0 25px 50px rgba(0,0,0,0.5); max-width: 280px;">
      ${previewImg ? `<img src="${previewImg}" alt="" style="width: 100%; height: 120px; object-fit: cover; border-radius: 16px; margin-bottom: 12px; opacity: ${isUnlocked ? '1' : '0.45'};" />` : ''}
      <h3 style="margin: 0; font-size: 18px; font-weight: 900; color: ${isUnlocked ? markerColor : '#64748b'}; text-transform: uppercase; letter-spacing: 0.1em;">
        ${isUnlocked ? loc.name[lang] : '??? Location ???'}
      </h3>
      <p style="font-size: 13px; margin: 10px 0; color: #94a3b8; line-height: 1.5;">
        ${isUnlocked ? loc.description[lang] : 'Search this area to uncover its history and collect your reward.'}
      </p>
      
      <div style="display: flex; align-items: center; gap: 8px; margin-top: 12px;">
        ${isQuest ? (!isUnlocked
            ? '<span style="font-size: 10px; color: #f59e0b; font-weight: 900; background: rgba(245,158,11,0.2); padding: 4px 10px; border-radius: 8px;">🔒 Quest Active</span>'
            : '<span style="font-size: 10px; color: #10b981; font-weight: 900; background: rgba(16,185,129,0.2); padding: 4px 10px; border-radius: 8px;">🔓 Unlocked</span>')
            : ''}
        ${isNFTReward && isUnlocked ? '<span style="font-size: 10px; color: #a855f7; font-weight: 900; background: rgba(168,85,247,0.15); padding: 4px 10px; border-radius: 8px;">🎖️ NFT</span>' : ''}
      </div>

      <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 15px;">
        <button onclick="window.setGlobalMapNavTarget ? window.setGlobalMapNavTarget('${loc.id}') : (window.startNavigationFromPopup && window.startNavigationFromPopup('${loc.name[lang] || loc.name.bs}', ${loc.coordinates ? loc.coordinates[0] : 0}, ${loc.coordinates ? loc.coordinates[1] : 0}))" style="width: 100%; padding: 12px; background: ${isUnlocked ? markerColor : '#1e293b'}; color: white; border: none; border-radius: 12px; font-weight: 900; font-family: 'Quicksand', sans-serif; cursor: pointer; text-transform: uppercase; font-size: 11px; letter-spacing: 0.1em;">
          ${lang === 'bs' ? '🧭 GPS Navigacija' : '🧭 GPS Navigation'}
        </button>
        
        ${isUnlocked && (loc.video || loc.id === 'mesa_selimovic') ? `
          <button onclick="window.playQuestVideo && window.playQuestVideo('${loc.video || '/assets/Gallery/QuestQRLocations/MesaSelimovic.mp4'}', '${(loc.name[lang] || loc.name.bs || 'Meša Selimović').replace(/'/g, "\\'")}')" style="width: 100%; padding: 12px; background: linear-gradient(135deg, #f59e0b, #d97706); color: #0f172a; border: none; border-radius: 12px; font-weight: 900; font-family: 'Quicksand', sans-serif; cursor: pointer; text-transform: uppercase; font-size: 11px; box-shadow: 0 4px 12px rgba(245,158,11,0.4);">
            🎬 ${lang === 'bs' ? 'Pogledaj Video' : 'Watch Cinematic'}
          </button>
        ` : ''}

        ${isNFTReward && isUnlocked ? `
          <button onclick="window.mintNFTReward('${NFT_IPFS}')" style="width: 100%; padding: 12px; background: linear-gradient(135deg, #7c3aed, #a855f7); color: white; border: none; border-radius: 12px; font-weight: 900; font-family: 'Quicksand', sans-serif; cursor: pointer; text-transform: uppercase; font-size: 11px;">
            🎖️ MINT NFT REWARD
          </button>
        ` : ''}
      </div>
    </div>
  `;
};

export const generateHotelPopupHtml = (hotel: any, lang: Language, hotelId: string) => {
    return `
    <div style="padding: 20px; font-family: 'Quicksand', sans-serif; background: #0f172a; color: white; border-radius: 24px; border: 2px solid #3b82f633; box-shadow: 0 30px 60px rgba(0,0,0,0.6); max-width: 280px;">
      <h3 style="margin: 0; font-size: 18px; font-weight: 900; color: #60a5fa;">${hotel.name}</h3>
      <p style="font-size: 13px; margin: 10px 0; color: #94a3b8; line-height: 1.5;">${hotel.description[lang]}</p>
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 15px;">
         <span style="font-size: 11px; color: #fbbf24; font-weight: 900; background: rgba(251,191,36,0.15); padding: 4px 10px; border-radius: 8px;">⭐ ${hotel.rating}</span>
         <span style="font-size: 10px; color: #60a5fa; font-weight: bold; text-transform: uppercase; background: rgba(59,130,246,0.1); padding: 4px 10px; border-radius: 8px;">🏨 Hotel</span>
      </div>
      <button onclick="window.setGlobalMapNavTarget('${hotelId}')" style="width: 100%; padding: 12px; background: #2563eb; color: white; border: none; border-radius: 12px; font-weight: 900; font-family: 'Quicksand', sans-serif; cursor: pointer; text-transform: uppercase; font-size: 11px;">
        Start GPS Navigation
      </button>
    </div>
  `;
};