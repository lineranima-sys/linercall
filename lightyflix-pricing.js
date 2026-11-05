// LightyFlix — preços por duração, com desconto progressivo para completar temporadas.
// Regras independentes do DOM e do Firestore, para facilitar os testes.
export const LIGHTY_PRICES = Object.freeze({
  shortEpisode: 150, // aproximadamente 10–15 minutos
  longEpisode: 300,  // aproximadamente 20 minutos
  seasonDiscount: 0.20
});
export const lightyEpisodeKey = (showId, season, number) =>
  'episode:' + showId + ':' + season + ':' + number;
export const lightySeasonKey = (showId, season) =>
  'season:' + showId + ':' + season;

export function episodePrice(duration) {
  const durationText = String(duration || '');
  const minutes = Number((durationText.match(/(\d+)\s*min/i) || [])[1]);
  if (Number.isFinite(minutes) && minutes > 0 && minutes <= 15) {
    return LIGHTY_PRICES.shortEpisode;
  }
  return LIGHTY_PRICES.longEpisode;
}

export function ownsEpisode(purchases, showId, season, number) {
  if (purchases?.[lightySeasonKey(showId, season)]) return true;
  return !!purchases?.[lightyEpisodeKey(showId, season, number)];
}

export function quoteSeason({showId, season, episodeCount, duration, purchases = {}}) {
  const count = Math.max(0, Math.floor(Number(episodeCount) || 0));
  const unitPrice = episodePrice(duration);
  const normalTotal = count * unitPrice;
  // Temporadas com apenas 1 episódio cadastrado não têm pacote com desconto.
  const discount = count > 1 ? Math.round(normalTotal * LIGHTY_PRICES.seasonDiscount) : 0;
  const bundleTotal = normalTotal - discount;
  const seasonOwned = !!purchases?.[lightySeasonKey(showId, season)];
  let paid = 0, ownedCount = 0;
  for (let number = 1; number <= count; number++) {
    const oldPurchase = purchases?.[lightyEpisodeKey(showId, season, number)];
    if (oldPurchase) {
      ownedCount++;
      const recorded = Number(oldPurchase.cost);
      paid += Number.isFinite(recorded) && recorded > 0 ? recorded : unitPrice;
    }
  }
  const completed = seasonOwned || ownedCount === count;
  const remaining = completed ? 0 : Math.max(0, bundleTotal - paid);
  return {count,unitPrice,normalTotal,discount,bundleTotal,paid,ownedCount,completed,remaining};
}
