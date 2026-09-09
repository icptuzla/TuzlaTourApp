import { QUEST_TARGETS } from '../constants/questData';
import { LOCATIONS } from '../constants';

export const normalizeQrText = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[ -_]/g, '')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase();

export const findQuestTargetFromQr = (decodedText: string) => {
  if (!decodedText) return undefined;
  const raw = decodedText.trim();
  const normalized = normalizeQrText(raw);

  // Extract last path segment if raw text is a URL or file path (e.g. /QRTrgSlobode.png -> QRTrgSlobode)
  const urlSegment = raw.includes('/') ? raw.split('/').filter(Boolean).pop()?.split('.')[0] : '';
  const normalizedUrlSeg = urlSegment ? normalizeQrText(urlSegment) : '';

  return QUEST_TARGETS.find((target) => {
    const constLocation = LOCATIONS.find(
      (l) =>
        l.id === target.id ||
        l.qrCode === target.id ||
        normalizeQrText(l.name?.en || '') === normalizeQrText(target.name?.en || '')
    );

    const candidates = [
      target.id,
      target.name?.en,
      target.name?.bs,
      (target as any).Html5Qrcode,
      (target as any).Html5Qrcode ? (target as any).Html5Qrcode.split('/').pop()?.split('.')[0] : '',
      constLocation?.qrCode,
      constLocation?.id,
      constLocation?.name?.en,
      constLocation?.name?.bs,
    ]
      .filter(Boolean)
      .map((c) => normalizeQrText(c as string));

    return candidates.some(
      (candidate) =>
        candidate === normalized ||
        (normalizedUrlSeg && candidate === normalizedUrlSeg) ||
        (candidate.length >= 3 && (candidate.includes(normalized) || normalized.includes(candidate)))
    );
  });
};
