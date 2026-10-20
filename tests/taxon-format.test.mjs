import test from 'node:test';
import assert from 'node:assert/strict';
import {formatScientificName,formatTaxonSummary,formatTaxonDiscrimination} from '../js/taxon-format.js';

test('italicizes genus and specific epithet as a binomial',()=>{
  assert.equal(formatScientificName('Agrilus oceanicus'),'<i class="taxon-scientific">Agrilus oceanicus</i>');
  assert.equal(formatScientificName('P. quadricollis'),'<i class="taxon-scientific">P. quadricollis</i>');
  assert.equal(formatScientificName('Sennius binotatus (Smith, 1900)'),
    '<i class="taxon-scientific">Sennius binotatus</i> (Smith, 1900)');
});
test('keeps sp. spp. other abbreviations and authors in roman type',()=>{
  assert.equal(formatScientificName('Psilocladus sp.'),'<i class="taxon-scientific">Psilocladus</i> sp.');
  assert.equal(formatScientificName('Psilocladus spp.'),'<i class="taxon-scientific">Psilocladus</i> spp.');
  assert.equal(formatScientificName('Sennius binotatus n. sp.'),
    '<i class="taxon-scientific">Sennius binotatus</i> n. sp.');
  assert.equal(formatScientificName('Sennius binotatus sp. nov.'),
    '<i class="taxon-scientific">Sennius binotatus</i> sp. nov.');
  assert.equal(formatScientificName('Passalus cf. lunaris'),
    '<i class="taxon-scientific">Passalus</i> cf. <i class="taxon-scientific">lunaris</i>');
  assert.equal(formatScientificName('Passalus aff. lunaris'),
    '<i class="taxon-scientific">Passalus</i> aff. <i class="taxon-scientific">lunaris</i>');
  assert.equal(formatScientificName('Agrilus oceanicus subsp. minor'),
    '<i class="taxon-scientific">Agrilus oceanicus</i> subsp. <i class="taxon-scientific">minor</i>');
});
test('higher taxa remain upright while genera and species get italics',()=>{
 const html=formatTaxonSummary({order:'Coleoptera',families:['Buprestidae'],subfamilies:['Agrilinae'],genera:['Agrilus'],species:['Agrilus oceanicus']});
 assert.match(html,/Ordem: Coleoptera · Família: Buprestidae · Subfamília: Agrilinae/);
 assert.match(html,/Gênero: <i class="taxon-scientific">Agrilus<\/i>/);
 assert.match(html,/Espécie: <i class="taxon-scientific">Agrilus oceanicus<\/i>/);
 assert.doesNotMatch(html,/<i[^>]*>(?:Coleoptera|Buprestidae|Agrilinae)<\/i>/);
});
test('discrimination highlights documented names, not sp. or spp.',()=>{
 const html=formatTaxonDiscrimination({
  genera:['Psilocladus','Sennius'],species:['Sennius binotatus'],
  discrimination:'63 Psilocladus sp.; 4 Psilocladus spp.; 8 Sennius binotatus n. sp. (Smith).'
 });
 assert.match(html,/63 <i class="taxon-scientific">Psilocladus<\/i> sp\./);
 assert.match(html,/4 <i class="taxon-scientific">Psilocladus<\/i> spp\./);
 assert.match(html,/<i class="taxon-scientific">Sennius binotatus<\/i> n\. sp\./);
 assert.doesNotMatch(html,/<i[^>]*>[^<]*\b(?:sp\.|spp\.)/);
});
test('HTML is escaped and scientific names are not guessed from prose',()=>{
 const html=formatTaxonDiscrimination({genera:['Agrilus'],species:[],discrimination:'Agrilus sp. <img src=x onerror=alert(1)>'});
 assert.match(html,/<i class="taxon-scientific">Agrilus<\/i> sp\./);
 assert.match(html,/&lt;img src=x onerror=alert\(1\)&gt;/);
 assert.doesNotMatch(html,/<img/);
});
