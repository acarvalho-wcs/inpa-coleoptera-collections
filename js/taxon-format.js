// Formatting only: preserve names and ranks transcribed from source guides.
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c =>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const reserved = new Set(['sp','spp','cf','aff','nr','indet','nov','n','subsp','ssp','var','f','spec']);
const italics = text => '<i class="taxon-scientific">'+escapeHtml(text)+'</i>';
const upper = '(?:\\p{Lu}[\\p{L}-]+|\\p{Lu}\\.)';
const lower = '(?:\\p{Ll}[\\p{L}-]*)';
const genusPattern = new RegExp('^('+upper+')(?=\\s|$)([\\s\\S]*)$','u');
const epithetPattern = new RegExp('^(\\s+)('+lower+')(?=$|[\\s.,;()])','u');
const qualifierPattern = new RegExp('^(\\s+)(cf\\.|aff\\.|nr\\.)(\\s+)('+lower+')(?=$|[\\s.,;()])','iu');
const belowSpeciesPattern = new RegExp('^(\\s+)(subsp\\.|ssp\\.|var\\.|f\\.)(\\s+)('+lower+')(?=$|[\\s.,;()])','iu');

export function formatScientificName(value) {
  const text=String(value??'').trim();
  const m=genusPattern.exec(text);
  if(!m)return escapeHtml(text);
  const genus=m[1],rest=m[2];
  const cf=qualifierPattern.exec(rest);
  if(cf&&!reserved.has(cf[4].toLowerCase()))
    return italics(genus)+escapeHtml(cf[1]+cf[2]+cf[3])+italics(cf[4])+escapeHtml(rest.slice(cf[0].length));
  const epithet=epithetPattern.exec(rest);
  if(epithet&&!reserved.has(epithet[2].toLowerCase())){
    let suffix=rest.slice(epithet[0].length);
    let result=italics(genus+epithet[1]+epithet[2]);
    const sub=belowSpeciesPattern.exec(suffix);
    if(sub&&!reserved.has(sub[4].toLowerCase())){
      result+=escapeHtml(sub[1]+sub[2]+sub[3])+italics(sub[4]);
      suffix=suffix.slice(sub[0].length);
    }
    return result+escapeHtml(suffix);
  }
  return italics(genus)+escapeHtml(rest);
}
export function formatTaxonSummary(taxa) {
  if(!taxa||typeof taxa!=='object')return '';
  const parts=[];
  if(taxa.order)parts.push('Ordem: '+escapeHtml(taxa.order));
  for(const [key,label,fn] of [
    ['families','Família',escapeHtml],
    ['subfamilies','Subfamília',escapeHtml],
    ['genera','Gênero',formatScientificName],
    ['species','Espécie',formatScientificName]
  ]){
    const values=Array.isArray(taxa[key])?taxa[key].filter(v=>typeof v==='string'&&v.trim()):[];
    if(values.length)parts.push(label+': '+values.map(fn).join(', '));
  }
  return parts.join(' · ');
}
const regexQuote=s=>[...s].map(c=>/[A-Za-z0-9]/.test(c)?c:'\\u{'+c.codePointAt(0).toString(16)+'}').join('');
export function formatTaxonDiscrimination(taxa) {
  const text=String(taxa?.discrimination??'');
  // Apply italics only to taxa explicitly catalogued, not to arbitrary prose.
  const candidates=[...new Set([...(taxa?.species||[]),...(taxa?.genera||[])])]
    .filter(v=>typeof v==='string'&&v.trim())
    .sort((a,b)=>b.length-a.length);
  if(!candidates.length)return escapeHtml(text);
  const re=new RegExp('(?<![\\p{L}])(?:'+candidates.map(regexQuote).join('|')+')(?![\\p{L}])','giu');
  let html='',offset=0,match;
  while((match=re.exec(text))){
    html+=escapeHtml(text.slice(offset,match.index));
    html+=formatScientificName(match[0]);
    offset=re.lastIndex;
  }
  return html+escapeHtml(text.slice(offset));
}
