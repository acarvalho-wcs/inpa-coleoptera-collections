// Coordenadas aproximadas dos centros de paises; nunca substituir por localizacao de instituicao.
export const COUNTRY_CENTROIDS={
  Brasil:[-14.2,-51.9], Brazil:[-14.2,-51.9], 'Estados Unidos':[38,-97], 'United States':[38,-97], USA:[38,-97],
  Alemanha:[51.2,10.4], Germany:[51.2,10.4], Franca:[46.5,2.2], França:[46.5,2.2], France:[46.5,2.2],
  'Reino Unido':[54,-2], 'United Kingdom':[54,-2], Mexico:[23.6,-102.5], México:[23.6,-102.5],
  Peru:[-9.2,-75.0], Colombia:[4.6,-74.1], Colômbia:[4.6,-74.1], Argentina:[-38.4,-63.6],
  Canada:[56,-106], Canadá:[56,-106], Italia:[42.8,12.5], Itália:[42.8,12.5], Espanha:[40.4,-3.7], Spain:[40.4,-3.7],
  Japao:[36.2,138.3], Japão:[36.2,138.3], Japan:[36.2,138.3], Australia:[-25.3,133.8], Austrália:[-25.3,133.8]
};
export function centerForCountry(country){if(!country)return null;const n=country.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();for(const [key,val] of Object.entries(COUNTRY_CENTROIDS))if(key.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()===n)return val;return null;}
