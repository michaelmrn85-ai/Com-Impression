// ── GUARD DOUBLE CHARGEMENT ─────────────────────────────────────────────────
if (window.__CI_LOADED__) { console.warn('COM Impression JS déjà chargé — skip'); }
else {
window.__CI_LOADED__ = true;

// ── FONCTION TOAST ──────────────────────────────────────────────────────────
function toast(msg) {
  var t = document.getElementById('ci-toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(function() { t.classList.remove('show'); }, 3200);
}

function ouvrirPanier() {
  var mpc = document.getElementById('m-pc');
  if (!mpc) return;
  mpc.classList.add('open');
  if (typeof goStep === 'function') {
    goStep((panier && panier.length > 0) ? 3 : 1);
  }
}

// ===== TARIFS =====
var QCV_CD=[50,100,250,500,1000,2500,5000,10000,15000,20000];
var TCV_CD={'Recto':[15.49,16.90,25.49,33.90,38.90,62.90,82.90,145.49,210.90,290.49],'Recto-Verso':[23.90,27.49,28.90,42.49,44.49,62.90,107.49,188.49,274.90,376.90]};
var QCV_CA=[50,100,250,500,1000,2500,5000];
var TCV_CA={'Recto':[35.90,37.49,40.90,47.49,60.90,105.49,160.90],'Recto-Verso':[35.90,37.49,42.49,50.90,69.49,117.90,193.90]};
var QCV_A6=[50,100,250,500,1000,2500,5000,7500,10000,15000,20000,30000];
var TCV_A6={'Recto':[33.49,36.49,44.90,57.90,67.90,110.90,168.90,218.90,280.90,415.49,565.90,972.90],'Recto-Verso':[34.90,37.49,49.49,57.90,73.90,116.90,177.49,227.90,292.90,433.49,588.90,1010.90]};
var QFL_A5=[50,100,250,500,1000,1500,2500,5000,7500,10000,15000,20000,30000];
var TFL_A5={'Recto':[27.49,28.90,36.49,51.90,61.90,73.90,91.90,118.49,153.90,192.49,282.49,360.90,658.90],'Recto-Verso':[28.90,31.90,43.49,61.90,69.49,78.49,102.49,131.90,170.49,212.90,310.90,396.49,696.90]};
var QFL_A6=[50,100,250,500,1000,1500,2500,5000,7500,10000,15000,20000,30000];
var TFL_A6={'Recto':[25.90,27.49,30.49,37.49,41.90,47.90,56.49,82.90,102.49,125.90,164.49,171.49,303.90],'Recto-Verso':[25.90,28.90,33.49,43.49,46.49,50.49,61.90,85.90,110.90,137.49,177.49,189.49,333.90]};
var QDEP=[50,100,250,500,1000,1500,2500,5000];
var TDEP={'1 pli A4→A5':[74.49,81.49,111.90,131.90,138.90,162.90,224.49,358.49],'1 pli A3→A4':[90.49,108.49,148.49,220.49,240.49,288.90,401.90,646.49],'1 pli A5→A6':[72.90,77.90,95.90,110.49,114.90,120.90,151.90,217.90],'2 plis A4→DL':[81.49,93.90,119.49,133.90,146.90,172.90,224.49,358.49],'2 plis 31.5x14.8→A6':[77.90,90.49,117.49,149.90,130.90,151.90,187.49,303.49]};
var QBRO=[1,5,10,25,50,100,250,500,1000,1500,2000,2500];
var TBRO_A4={'8p':[63.90,65.90,69.49,77.90,95.49,167.90,253.90,387.49,495.49,763.49,900.90,1285.90],'12p':[63.90,67.49,72.90,84.90,108.90,203.90,335.49,488.49,715.90,970.90,810.90,1088.49],'16p':[63.90,69.49,74.49,93.49,162.49,240.49,416.49,500.90,827.90,859.49,1024.49,1397.49],'20p':[63.90,70.90,77.90,100.49,181.49,241.90,445.90,607.90,1008.49,1036.49,1286.49,1743.49],'24p':[63.90,72.49,79.49,107.49,198.90,274.90,530.49,735.49,946.49,1262.90,1524.49,2250.90],'28p':[63.90,72.49,82.90,160.90,236.90,307.90,547.49,840.90,1083.90,1443.90,1667.90,2274.90],'32p':[65.90,75.90,84.90,160.90,236.90,338.90,607.49,857.49,1252.90,1558.49,1876.49,2547.90],'36p':[65.90,75.90,88.49,169.49,253.90,371.90,607.90,954.49,1456.90,1749.90,2099.90,2847.90],'40p':[65.90,77.90,91.90,177.90,238.90,404.49,665.90,1050.49,1517.90,1921.49,2325.49,3147.90]};
var TBRO_A5={'8p':[63.90,63.90,65.90,70.90,79.49,98.49,198.90,244.49,355.90,422.90,561.90,800.49],'12p':[63.90,65.90,67.49,74.49,86.49,112.49,245.90,316.49,489.49,587.49,789.49,1015.90],'16p':[63.90,65.90,69.49,77.90,103.90,122.90,277.90,386.49,618.49,763.49,900.90,1285.90],'20p':[63.90,67.49,72.49,84.90,110.49,162.90,335.49,436.49,737.49,970.90,1088.49,1517.90],'24p':[63.90,70.90,74.49,90.49,115.90,184.90,374.90,488.49,827.90,861.90,1018.49,1146.90],'28p':[63.90,70.90,77.90,93.49,124.49,201.90,409.90,527.49,920.49,1031.49,1184.90,1354.49],'32p':[63.90,72.49,77.90,96.49,133.90,224.90,447.49,560.49,946.49,1112.49,1272.49,1458.90],'36p':[63.90,72.49,79.49,100.49,162.90,258.90,547.49,715.90,1146.49,1475.49,1800.49,2494.49],'40p':[63.90,74.49,82.90,105.90,181.49,285.49,608.90,826.90,1327.90,1706.90,2080.49,2879.90]};
var TAF_A4={'Recto':{Q:[5,10,20,25,50,100,250,500,1000,2500,5000],P:[34.90,34.90,36.49,37.49,40.49,57.90,66.49,81.49,99.49,153.90,323.49]},'Recto-Verso':{Q:[5,10,20,25,50,100,250,500,1000,2500,5000],P:[34.90,36.49,37.49,38.90,43.49,53.49,64.90,94.90,112.49,174.49,305.90]}};
var TAF_A3={'Recto':{Q:[5,10,20,25,50,100,250,500,1000,2500,5000],P:[36.49,37.49,40.49,41.90,59.49,60.90,76.90,121.49,175.90,280.90,591.90]},'Recto-Verso':{Q:[5,10,20,25,50,100,250,500,1000,2500,5000],P:[37.49,38.90,43.49,56.49,54.90,57.90,73.90,168.90,205.49,315.90,660.90]}};
var TAF_A2={'Recto':{Q:[1,5,10,25,50,100,250,500,1000,2500,5000],P:[34.90,60.90,51.90,60.90,78.49,87.49,159.90,168.90,242.49,439.49,927.90]},'Recto-Verso':{Q:[1,5,10,25,50,100,250,500,1000,2500,5000],P:[34.90,60.90,57.90,73.90,78.49,125.90,196.49,205.49,285.49,514.90,1037.90]}};
var TAF_A1={'Recto':{Q:[1,5,10,25,50,100,250,500,1000,2500,5000],P:[22.90,57.49,100.90,137.90,162.90,187.49,201.49,325.49,522.90,1084.90,1950.90]},'Recto-Verso':{Q:[25,50,100,250,500,1000,2500,5000],P:[279.49,312.90,358.90,358.90,559.49,844.90,1580.90,2746.90]}};
var TAF_A0={'Recto':{Q:[1,5,10,15,20,25,50,100,250,500,1000,2000],P:[36.49,79.49,123.90,148.49,171.49,217.49,355.49,446.90,517.90,635.49,1021.90,1597.49]}};
var QCHEM_A4=[25,50,100,250,500,1000,2500,5000,10000,20000];
var TCHEM_A4={'Recto':[155.90,183.49,205.90,290.49,361.49,557.90,1030.90,1857.49,3562.90,6989.90],'Recto-Verso':[184.90,221.49,257.49,359.90,407.90,630.49,1124.49,1994.49,3793.90,7409.90]};
var QCHEM_A5=[25,50,100,250,500,1000,2500,5000,10000,15000,20000];
var TCHEM_A5={'Recto':[107.49,141.90,176.49,216.49,264.49,387.49,815.90,1465.49,2763.49,3930.90,5189.49],'Recto-Verso':[119.49,162.49,184.90,222.90,266.49,400.90,815.90,1490.90,2799.49,3966.90,5222.49]};
var QFP=[5,10,15,20,25,50,75,100,250,500];
var TFP_A6={'Sans enveloppe':[37.49,37.49,37.49,37.49,37.49,38.90,40.90,42.49,52.49,67.90],'Enveloppe blanche':[42.49,43.90,45.90,45.90,47.49,54.49,60.90,67.90,95.49,148.49],'Env. couleur':[50.90,55.49,57.49,62.49,67.90,70.90,93.49,106.90,195.49,336.49]};
var TFP_A5={'Sans enveloppe':[42.49,43.90,45.90,47.49,48.90,57.49,65.90,65.90,108.90,165.90],'Enveloppe blanche':[47.49,50.49,54.49,57.49,60.90,69.49,73.90,81.49,156.90,230.49],'Env. couleur':[52.49,55.90,60.90,69.49,73.49,93.49,122.90,153.90,290.90,460.90]};
var QFID=[50,100,250,500,1000,2500,5000,10000,15000,20000];
var TFID={'Recto':[15.49,16.90,25.49,33.90,38.90,62.90,82.90,145.49,210.90,290.49],'Recto-Verso':[23.90,27.49,28.90,42.49,44.49,62.90,107.49,188.49,274.90,376.90]};
var TFID_P={'Recto':[112.49,117.90,124.49,143.49,181.49,295.49,316.49,608.90,866.49,1144.49],'Recto-Verso':[114.49,117.90,126.49,148.90,193.90,326.90,355.90,693.49,992.90,1313.90]};
var QSAC=[50,100,250,500,1000,1500,2000];
var TSAC_BT={'Kraft Blanc Recto':[146.90,191.90,347.49,600.90,1122.90,1683.90,2252.49],'Kraft Blanc R/V':[183.49,229.90,411.49,817.90,1490.90,2223.90,2945.49],'Kraft Brun Recto':[155.49,183.49,324.90,568.90,1090.49,1635.49,2185.90],'Kraft Brun R/V':[193.90,219.49,390.90,785.49,1458.49,2172.90,2880.49]};
var TSAC_24={'Kraft Blanc Recto':[145.49,203.90,328.49,590.49,938.49,1411.49,1889.90],'Kraft Blanc R/V':[186.90,264.49,433.90,824.90,1402.49,2035.90,2694.90],'Kraft Brun Recto':[141.90,195.49,314.49,577.49,900.90,1349.90,1806.90],'Kraft Brun R/V':[183.49,257.49,419.90,812.49,1360.90,1972.90,2611.90]};
var QENV=[10,25,50,75,100,250,500,1000,2500,5000,7500,10000];
var TENV={'DL sans fenêtre':[75.90,79.49,84.90,88.49,97.49,108.49,138.90,180.49,283.49,462.49,682.49,898.90],'DL avec fenêtre':[75.90,79.49,84.90,90.49,97.49,110.49,140.90,175.49,292.49,478.49,709.49,934.90],'C5 sans fenêtre':[126.49,135.49,140.90,148.49,157.49,173.49,214.90,256.49,452.90,812.49,1182.49,1552.49],'C5 avec fenêtre':[131.90,140.90,146.49,155.49,164.49,182.49,227.49,263.49,462.49,828.49,1205.90,1584.90],'C4 sans fenêtre':[194.90,200.49,211.49,220.49,225.90,234.90,297.90,404.49,754.49,1328.49,1932.90,2537.90],'C4 avec fenêtre':[171.49,180.49,191.49,200.49,214.90,232.90,299.90,409.90,763.49,1344.90,1956.49,2571.90]};
var TMENU_A5={Q:[25,50,100,250,500,1000,2500,5000],'Recto':[33.90,37.49,43.49,58.49,77.90,106.90,222.90,406.49],'Recto-Verso':[35.90,33.90,45.49,67.90,82.90,138.49,266.90,552.90]};
var TMENU_A4={Q:[25,50,100,250,500,1000,2500,5000],'Recto':[15.49,16.90,18.90,28.49,37.90,43.49,69.90,92.49],'Recto-Verso':[26.49,29.90,30.49,31.90,47.49,48.90,69.90,117.49]};
var TMENU_DEP_A4={Q:[25,100,500,1000],'Recto-Verso':[96.49,118.90,200.49,295.90]};
var TMENU_DEP_A3={Q:[25,100,500,1000],'Recto-Verso':[103.90,133.90,309.90,558.90]};
var QSET=[25,50,100,250,500,1000,2500,5000,10000,25000,50000];
var TSET={'Recto':[35.90,41.49,52.90,69.90,130.49,160.49,298.49,517.49,948.49,2206.90,4337.90],'Recto-Verso':[39.90,47.49,65.90,98.49,156.90,188.90,339.90,583.90,1016.90,2424.90,4757.90]};
var QACP=[50,100,250,500,1000,2500];
var TACP={'Recto':[33.90,38.90,54.49,79.49,119.49,243.90],'Recto-Verso':[33.90,40.90,59.49,76.49,129.90,285.49]};
var QCHEV=[10,25,50,75,100,250,500,750,1000];
var TCHEV={'A6 Portrait':[82.90,94.49,100.49,105.90,111.49,241.90,330.49,420.90,509.90],'Triangle DL':[96.90,109.49,171.90,177.49,185.49,251.49,326.90,400.49,475.90]};
var QLIVR=[1,5,10,25,50,100,250,500,1000];
var TLIVR={'A5 (Portrait/Paysage)':[102.49,111.90,124.49,159.90,220.90,318.49,653.90,1034.49,1892.90],'Carré 21x21':[105.90,122.90,144.49,208.49,315.49,495.49,1119.90,1826.49,3287.90],'A4 (Portrait/Paysage)':[105.90,124.49,145.90,211.49,318.49,503.49,1139.90,1883.49,3390.90]};
var TKAK={'60x160 cm':39,'80x200 cm':49,'100x200 cm':59};

// ===== TARIFS COM'EXTÉRIEUR =====
var TBACHE_SS_OE={'100x100':36.49,'200x200':84.49,'300x300':177.90,'400x400':286.90};
var TBACHE_AV_OE={'100x100':37.49,'200x200':103.90,'300x300':225.49,'400x400':363.90};
var TBACHE_MICRO={'100x100':34.90,'200x200':131.90,'300x300':217.49,'400x400':375.90};
var TBACHE_MICRO_OE={'100x100':37.49,'200x200':151.49,'300x300':265.49,'400x400':459.90};
var TTISSU_4OE={'100x100':64.90,'200x200':198.90,'300x300':385.49,'400x400':629.49};
var QBARR=[1,2,3,5,10];
var TBARR_STD={'200x80':[205.90,412.90,599.49,967.90,1653.49],'200x90':[234.49,428.49,624.49,1013.90,1941.49]};
var TBARR_LONG={'250x80':[209.49,385.90,560.90,913.90,1793.49],'250x90':[243.90,453.49,662.49,1087.49,2127.49],'250x100':[284.49,533.90,783.49,1282.90,2532.90]};
var TAIMANT={'100x100':95.90,'200x200':301.49,'300x300':665.90};
var TAKYLUX_SS={'100x100':43.90,'200x200':91.90,'300x300':196.90};
var TAKYLUX_AV={'100x100':45.90,'200x200':93.49,'300x300':198.90};
var TALUDIO_SS={'20x20':[130.90,136.49,163.49],'30x20':[136.49,147.90,192.00],'40x30':[153.90,184.49,276.49]};
var TALUDIO_AV={'20x20':[178.90,199.90,268.90],'30x20':[188.49,213.49,307.49],'40x30':[211.49,259.49,416.90]};
var QALUDIO=[1,2,5];
var TIMMO_V={'100x100':52.49,'200x200':122.90,'300x300':209.49};
var QBARNUM=[1,2,3,4,5];
var TBARNUM=[2087.90,3374.49,4849.90,5930.90,7317.49];
var QPARAV=[1,2,3,4,5,10,15,20,50];
var TPARAV=[125.90,229.90,333.49,435.49,539.49,1048.49,1561.90,2094.49,5217.49];
var QTRANSAT=[1,2,3,4,5,10,15,20,25];
var TTRANSAT=[132.49,233.90,333.90,435.49,534.90,1069.90,1604.90,2137.90,2642.49];
var QCHAISE=[1,2,3,4,5,10];
var TCHAISE=[244.49,456.49,649.90,829.90,1029.90,1990.90];
var QPARASOL=[1,2,3,4,5,10];
var TPARASOL_SS=[513.90,829.90,1195.90,1442.49,1801.90,3603.90];
var TPARASOL_AV=[582.90,939.90,1357.90,1635.49,2044.49,4088.90];
var QCOLONNE=[1,2,3,4,5,10];
var TCOLONNE_SS=[467.90,905.49,1340.90,1777.90,2245.90,4459.49];
var TCOLONNE_AV=[573.90,1115.49,1656.90,2198.49,2769.90,5507.90];
var QROLLUP=[1,2,3,4,5,10];
var TROLLUP_R=[273.90,521.49,785.49,1037.90,1285.49,2526.90];
var TROLLUP_RV=[302.49,588.49,869.90,1147.90,1420.49,2797.49];
var QBEACH=[1,2,5,10];
var TBEACH={'2,03m':[134.49,231.49,496.49,929.49],'2,40m':[144.90,249.49,524.90,922.49],'3,08m':[158.90,282.90,637.49,1210.90],'3,51m':[282.90,526.49,1294.49,2413.49],'4,65m':[335.90,685.90,1577.49,2974.49]};
var QSTOP=[1,2,5];
var TSTOP_ECO={'Bâche 510g':[169.90,316.49,815.90],'Papier photo 200g':[174.90,328.90,846.49]};
var TSTOP_EMB={'Bâche 510g':[302.49,617.49,1497.90],'Papier photo 200g':[309.49,629.90,1526.90]};
var QARCHE=[1,2,3];
var TARCHE_CPL={'370cm':[774.90,1520.90,2264.90],'550cm':[1043.90,2057.90,3098.90]};
var TARCHE_REA={'370cm':[488.49,893.90,1327.49],'550cm':[695.90,1306.49,1944.90]};
var QD=[10,25,50,100,250,500,1000];

// ===== CATALOGUE =====
var CAT = {
"compro":[
{id:'carte-cd',nom:'Carte de visite (coin droit)',T:TCV_CD,Q:QCV_CD,prix:'dès 15,49 €',opts:{'Impression':['Recto','Recto-Verso'],'Papier':['350g couché demi mat']},desc:'8,5×5,4 cm'},
{id:'carte-ca',nom:'Carte de visite (coin arrondi)',T:TCV_CA,Q:QCV_CA,prix:'dès 35,90 €',opts:{'Impression':['Recto','Recto-Verso'],'Papier':['350g couché demi mat']},desc:'8,5×5,4 cm'},
{id:'carte-a6',nom:'Carte de visite A6',T:TCV_A6,Q:QCV_A6,prix:'dès 33,49 €',opts:{'Impression':['Recto','Recto-Verso'],'Papier':['350g couché demi mat']},desc:'Format A6'},
{id:'flyer-a5',nom:'Flyer A5',T:TFL_A5,Q:QFL_A5,prix:'dès 27,49 €',opts:{'Impression':['Recto','Recto-Verso'],'Papier':['135g couché brillant']},desc:'Format A5'},
{id:'flyer-a6',nom:'Flyer A6',T:TFL_A6,Q:QFL_A6,prix:'dès 25,90 €',opts:{'Impression':['Recto','Recto-Verso'],'Papier':['135g couché demi mat']},desc:'Format A6'},
{id:'depliant',nom:'Dépliant',T:TDEP,Q:QDEP,prix:'dès 72,90 €',opts:{'Format':['1 pli A4→A5','1 pli A3→A4','1 pli A5→A6','2 plis A4→DL','2 plis 31.5x14.8→A6'],'Papier':['135g couché brillant']}},
{id:'brochure-a4',nom:'Brochure agrafée A4',T:TBRO_A4,Q:QBRO,prix:'dès 63,90 €',opts:{'Pages':['8p','12p','16p','20p','24p','28p','32p','36p','40p'],'Papier':['90g offset']},desc:'2 agrafes'},
{id:'brochure-a5',nom:'Brochure agrafée A5',T:TBRO_A5,Q:QBRO,prix:'dès 63,90 €',opts:{'Pages':['8p','12p','16p','20p','24p','28p','32p','36p','40p'],'Papier':['90g offset']},desc:'2 agrafes'},
{id:'affiche',nom:'Affiche',T:null,Q:null,prix:'dès 22,90 €',prixSpecial:true,opts:{'Format':['A4','A3','A2','A1','A0'],'Impression':['Recto','Recto-Verso']},desc:'135g couché brillant'},
{id:'chemise-a4',nom:'Chemise A4',T:TCHEM_A4,Q:QCHEM_A4,prix:'dès 155,90 €',opts:{'Impression':['Recto','Recto-Verso']}},
{id:'chemise-a5',nom:'Chemise A5',T:TCHEM_A5,Q:QCHEM_A5,prix:'dès 107,49 €',opts:{'Impression':['Recto','Recto-Verso']}},
{id:'fairepart-a6',nom:'Faire-part A6',T:TFP_A6,Q:QFP,prix:'dès 37,49 €',opts:{'Enveloppe':['Sans enveloppe','Enveloppe blanche','Env. couleur']}},
{id:'fairepart-a5',nom:'Faire-part A5',T:TFP_A5,Q:QFP,prix:'dès 42,49 €',opts:{'Enveloppe':['Sans enveloppe','Enveloppe blanche','Env. couleur']}},
{id:'carte-fidel',nom:'Carte de fidélité',T:TFID,Q:QFID,prix:'dès 15,49 €',opts:{'Impression':['Recto','Recto-Verso']}},
{id:'carte-fidel-pliee',nom:'Carte fidélité pliée',T:TFID_P,Q:QFID,prix:'dès 112,49 €',opts:{'Impression':['Recto','Recto-Verso']}},
{id:'sac-kraft-bt',nom:'Sac Kraft Bouteille',T:TSAC_BT,Q:QSAC,prix:'dès 146,90 €',opts:{'Variante':['Kraft Blanc Recto','Kraft Blanc R/V','Kraft Brun Recto','Kraft Brun R/V']}},
{id:'sac-kraft-24',nom:'Sac Kraft 24x11x32',T:TSAC_24,Q:QSAC,prix:'dès 141,90 €',opts:{'Variante':['Kraft Blanc Recto','Kraft Blanc R/V','Kraft Brun Recto','Kraft Brun R/V']}},
{id:'enveloppe',nom:'Enveloppe imprimée',T:TENV,Q:QENV,prix:'dès 75,90 €',opts:{'Format':['DL sans fenêtre','DL avec fenêtre','C5 sans fenêtre','C5 avec fenêtre','C4 sans fenêtre','C4 avec fenêtre']}},
{id:'menu-resto',nom:'Menu restaurant',T:null,Q:null,prix:'dès 15,49 €',prixSpecial:true,opts:{'Format':['Simple A5','Simple A4','Dépliant A4 (1 pli)','Dépliant A3 (1 pli)'],'Impression':['Recto','Recto-Verso']}},
{id:'set-table',nom:'Set de table',T:TSET,Q:QSET,prix:'dès 35,90 €',opts:{'Impression':['Recto','Recto-Verso']}},
{id:'accroche-porte',nom:'Accroche-porte',T:TACP,Q:QACP,prix:'dès 33,90 €',opts:{'Impression':['Recto','Recto-Verso']}},
{id:'chevalet',nom:'Chevalet de table',T:TCHEV,Q:QCHEV,prix:'dès 82,90 €',opts:{'Format':['A6 Portrait','Triangle DL']}},
{id:'livre-photo',nom:'Livre photo',T:TLIVR,Q:QLIVR,prix:'dès 102,49 €',opts:{'Format':['A5 (Portrait/Paysage)','Carré 21x21','A4 (Portrait/Paysage)']}}
],
"comext":[
{id:'bache-ss-oe',nom:'Bâche sans œillet',T:TBACHE_SS_OE,Q:null,prix:'dès 36,49 €',dims:true,dimsLibres:true,opts:{'Matière':['Bâche PVC 510g']},desc:'Min 50×50 cm'},
{id:'bache-av-oe',nom:'Bâche avec œillets',T:TBACHE_AV_OE,Q:null,prix:'dès 37,49 €',dims:true,dimsLibres:true,opts:{'Matière':['Bâche PVC 510g']},desc:'Min 50×50 cm'},
{id:'bache-micro',nom:'Bâche micro-perforée',T:TBACHE_MICRO,Q:null,prix:'dès 34,90 €',dims:true,dimsLibres:true,opts:{'Finition':['Sans œillet','Avec œillets']},desc:'Min 50×50 cm'},
{id:'tissu-fourreau',nom:'Tissu avec fourreaux',T:TTISSU_4OE,Q:null,prix:'dès 64,90 €',dims:true,dimsLibres:true,opts:{'Matière':['Tissu polyester']},desc:'Min 50×50 cm'},
{id:'adhesif-vinyle',nom:'Adhésif vinyle',T:null,Q:null,prix:'Sur devis',dims:true,dimsLibres:true,opts:{'Type':['Vinyle monomat','Vinyle cast','Dépoli'],'Finition':['Mat','Brillant']}},
{id:'barr-std',nom:'Habillage barrière 200 cm',T:TBARR_STD,Q:QBARR,prix:'dès 205,90 €',opts:{'Format':['200x80','200x90']},desc:'J+8'},
{id:'barr-long',nom:'Habillage barrière 250 cm',T:TBARR_LONG,Q:QBARR,prix:'dès 209,49 €',opts:{'Format':['250x80','250x90','250x100']},desc:'J+8'},
{id:'akylux-ss',nom:'Panneau Akylux sans perçage',T:TAKYLUX_SS,Q:null,prix:'dès 43,90 €',dims:true,dimsLibres:true,opts:{'Impression':['Recto']},desc:'J+5'},
{id:'akylux-av',nom:'Panneau Akylux percé',T:TAKYLUX_AV,Q:null,prix:'dès 45,90 €',dims:true,dimsLibres:true,opts:{'Impression':['Recto']},desc:'J+5'},
{id:'panneau-immo',nom:'Panneau immobilier V',T:TIMMO_V,Q:null,prix:'dès 52,49 €',dims:true,dimsLibres:true,opts:{'Finition':['Rainage + 4 œillets']},desc:'J+5'},
{id:'panneau-permis',nom:'Panneau permis de construire',T:null,Q:null,prix:'45,90 €',opts:{'Format':['100x100 cm']},desc:'J+5'},
{id:'alu-dibond-ss',nom:'Alu-Dibond sans entretoises',T:TALUDIO_SS,Q:QALUDIO,prix:'dès 130,90 €',opts:{'Format':['20x20 cm','30x20 cm','40x30 cm'],'Blanc de soutien':['Avec','Sans']},desc:'J+6'},
{id:'alu-dibond-av',nom:'Alu-Dibond 4 entretoises',T:TALUDIO_AV,Q:QALUDIO,prix:'dès 178,90 €',opts:{'Format':['20x20 cm','30x20 cm','40x30 cm']},desc:'J+6'},
{id:'plaque-aimant',nom:'Plaque aimantée',T:TAIMANT,Q:null,prix:'dès 95,90 €',dims:true,dimsLibres:true,opts:{'Finition':['Magnétique 0,5mm']},desc:'J+4'},
{id:'rollup-ext',nom:'Roll-Up Extérieur 80×200',T:null,Q:QROLLUP,prix:'dès 273,90 €',opts:{'Face':['Recto seul','Recto / Verso']},desc:'J+4'},
{id:'beach-flag',nom:'Beach Flag Plume',T:TBEACH,Q:QBEACH,prix:'dès 134,49 €',opts:{'Hauteur':['2,03m','2,40m','3,08m','3,51m','4,65m']},desc:'J+8'},
{id:'stop-trottoir',nom:'Stop-trottoir A1',T:null,Q:QSTOP,prix:'dès 169,90 €',opts:{'Modèle':['Éco (structure légère)','Embase lestable'],'Matière':['Bâche 510g','Papier photo 200g']},desc:'J+5'},
{id:'arche-drapeau',nom:'Arche drapeau',T:null,Q:QARCHE,prix:'dès 488,49 €',opts:{'Format':['370cm','550cm'],'Type':['Complète (structure+pieds)','Réassort (impression seule)']},desc:'J+10'},
{id:'barnum',nom:'Barnum 3×3m',T:null,Q:QBARNUM,prix:'dès 2 087,90 €',opts:{'Format':['3×3 m']},desc:'J+8'},
{id:'paravent',nom:'Paravent de plage',T:null,Q:QPARAV,prix:'dès 125,90 €',opts:{'Modèle':['4 pans']},desc:'J+6'},
{id:'transat',nom:'Transat bois',T:null,Q:QTRANSAT,prix:'dès 132,49 €',opts:{'Toile':['44×136 cm sublimation']},desc:'J+12'},
{id:'chaise-cinema',nom:'Chaise cinéma',T:null,Q:QCHAISE,prix:'dès 244,49 €',opts:{'Matière':['Bois brut clair']},desc:'J+7'},
{id:'parasol',nom:'Parasol publicitaire',T:null,Q:QPARASOL,prix:'dès 513,90 €',opts:{'Modèle':['Sans embase','Avec pied']},desc:'J+11'},
{id:'colonne-gonf',nom:'Colonne gonflable',T:null,Q:QCOLONNE,prix:'dès 467,90 €',opts:{'Modèle':['Sans gonfleur','Avec gonfleur électrique']},desc:'J+10'}
],
"comperso":[
{id:'tshirt',nom:'T-shirt Unisexe (Impression Directe)',prix:'32,90 €',
 T:{'Impression RECTO':[32.90],'Impression RECTO / VERSO':[45.90]},Q:[1],
 opts:{'Marquage':['Impression RECTO','Impression RECTO / VERSO'],
       'Coloris':['Noir','Blanc','Orange','Bleu','Bleu Foncé','Gris','Rouge','Jaune']},
 desc:'BAT inclus • Délai standard',textile:true},
{id:'tshirt-broderie',nom:'T-shirt Personnalisé en Broderie',prix:'56,90 €',
 T:{'Broderie Cœur (Poitrine)':[56.90]},Q:[1],
 opts:{'Marquage':['Broderie Cœur (Poitrine)'],
       'Coloris':['Blanc','Noir','Rouge','Bleu','Gris','Orange','Vert','Beige','Jaune','Gris foncé','Gris clair','Violet']},
 desc:'Finition Haut de Gamme',textile:true},
{id:'polo',nom:'Polo Personnalisé en Broderie',prix:'56,49 €',
 T:{'Broderie Cœur (Poitrine)':[56.49]},Q:[1],
 opts:{'Marquage':['Broderie Cœur (Poitrine)'],
       'Coloris':['Noir','Blanc','Bleu marine','Rouge','Gris chiné','Bleu roi','Orange','Vert','Bordeaux','Jaune','Violet','Bleu ciel','Vert bouteille','Émeraude','Bleu nuit','Rouge chiné','Bleu roi chiné','Bleu marine chiné','Vert chiné','Gris chiné foncé']},
 desc:'Qualité Premium • 20 coloris',textile:true},
{id:'veste',nom:'Veste Softshell',prix:'102,49 €',
 T:{'Personnalisation incluse':[102.49]},Q:[1],
 opts:{'Marquage':['Personnalisation incluse'],
       'Coloris':['Noir','Bleu de minuit','Bleu roi','Rouge','Vert kaki']},
 desc:'Déperlante • Coupe-vent • Broderie incluse',textile:true},
{id:'chemise',nom:'Chemise (Broderie incluse)',prix:'108,49 €',
 T:{'Broderie Cœur (Poitrine)':[108.49]},Q:[1],
 opts:{'Marquage':['Broderie Cœur (Poitrine)'],
       'Coloris':['Blanc','Bleu clair']},
 desc:'Coupe cintrée • Manches longues • Style Premium',textile:true},
{id:'casquette',nom:'Casquette Personnalisée',prix:'52,49 €',
 T:{'Impression incluse':[52.49]},Q:[1],
 opts:{'Marquage':['Impression incluse']},
 desc:'Finition Premium'},
{id:'casquette-broderie',nom:'Casquette Personnalisée Broderie',prix:'83,90 €',
 T:{'Broderie incluse':[83.90]},Q:[1],
 opts:{'Marquage':['Broderie incluse']},
 desc:'Finition Premium Broderie'},
{id:'totebag',nom:'Tote Bag Carolina (Coton Naturel)',prix:'52,90 €',
 T:{'Impression Transfert Quadrichromie':[52.90]},Q:[1],
 opts:{'Marquage':['Impression Transfert Quadrichromie'],'Face':['Devant']},
 desc:'100% Coton • Couleur Naturelle'},
{id:'gobelet',nom:'Gobelet Personnalisé 12cL/18cL',prix:'dès 47,90 €',
 T:{'Impression Quadrichromie':[47.9, 90.49, 151.9, 266.9, 480.49, 876.49]},
 Q:[10, 50, 100, 250, 500, 1000],
 opts:{'Marquage':['Impression Quadrichromie']},
 desc:'Plastique givré translucide • Délai J+12',unite:'piece'}
],
"comservices":[
{id:'impression-doc',nom:'Impression de document',prix:'dès 0,05 €/page',opts:{'Grammage':['80g (standard)','90g (premium)'],'Format':['A4'],'Couleur':['Noir & Blanc','Couleur'],'Impression':['Recto','Recto-Verso']},T:{'80g|N&B|Recto':[0.10,0.08,0.06,0.05],'80g|N&B|RV':[0.18,0.14,0.10,0.09],'80g|Col|Recto':[0.10,0.08,0.06,0.05],'80g|Col|RV':[0.18,0.14,0.10,0.09],'90g|N&B|Recto':[0.12,0.10,0.08,0.07],'90g|N&B|RV':[0.22,0.18,0.14,0.12],'90g|Col|Recto':[0.12,0.10,0.08,0.07],'90g|Col|RV':[0.22,0.18,0.14,0.12]},Q:[1,11,50,1000],dims:false,unite:'page'},
{id:'plastif-a4',nom:'Plastification A4',prix:'0,50 €/u',prixUnit:0.50,unite:'pièce',
 T:{'Plastification':[0.50]},Q:[1],opts:{'Type':['Plastification']},desc:'Format A4 • Finition brillante'},
{id:'photo-10x15-bri',nom:'Photo 10×15 Brillant',prix:'0,22 €/u',prixUnit:0.22,unite:'pièce',
 T:{'Brillant':[0.22]},Q:[1],opts:{'Finition':['Brillant']},desc:'10×15 cm • Papier photo brillant'},
{id:'photo-13x18-bri',nom:'Photo 13×18 Brillant',prix:'0,52 €/u',prixUnit:0.52,unite:'pièce',
 T:{'Brillant':[0.52]},Q:[1],opts:{'Finition':['Brillant']},desc:'13×18 cm • Papier photo brillant'},
{id:'photo-10x15-sat',nom:'Photo 10×15 Satin',prix:'0,55 €/u',prixUnit:0.55,unite:'pièce',
 T:{'Satin':[0.55]},Q:[1],opts:{'Finition':['Satin']},desc:'10×15 cm • Papier photo satin'},
{id:'photo-a4-sat',nom:'Photo A4 Satin',prix:'1,52 €/u',prixUnit:1.52,unite:'pièce',
 T:{'Satin':[1.52]},Q:[1],opts:{'Finition':['Satin']},desc:'Format A4 • Papier photo satin'},
{id:'photo-a4-bri',nom:'Photo A4 Brillant',prix:'0,64 €/u',prixUnit:0.64,unite:'pièce',
 T:{'Brillant':[0.64]},Q:[1],opts:{'Finition':['Brillant']},desc:'Format A4 • Papier photo brillant'}
],
"comevt":[
{id:'faire-part-a5',nom:'Faire-Part A5 (Sans pli)',prix:'dès 48,90 €',
 T:{'Recto|Sans enveloppe':[48.90,52.49,60.90,82.90],'Recto|Enveloppes blanches':[60.90,70.90,79.49,131.49],'Recto|Env. bleues / roses':[67.49,86.49,105.49,188.49],
    'Recto-Verso|Sans enveloppe':[48.90,53.90,65.90,82.90],'Recto-Verso|Enveloppes blanches':[60.90,72.49,86.49,141.49],'Recto-Verso|Env. bleues / roses':[67.49,88.49,110.49,164.49]},
 Q:[25,50,100,250],opts:{'Impression':['Recto','Recto-Verso'],'Enveloppe':['Sans enveloppe','Enveloppes blanches','Env. bleues / roses']},desc:'Format A5 • Papier Standard • J+3'},
{id:'faire-part-pli',nom:'Faire-Part avec Pli (Vernis Sélectif)',prix:'dès 266,49 €',
 T:{'Vernis Sélectif':[266.49,273.49,286.90,316.49,378.90,509.90]},Q:[10,25,50,100,250,500],
 opts:{'Finition':['Vernis Sélectif']},desc:'21×14,8 cm ouvert • 1 pli • J+9'},
{id:'faire-part-a6-evt',nom:'Faire-Part A6 (Sans pli)',prix:'dès 45,90 €',
 T:{'Recto|Sans enveloppe':[45.90,47.49,50.90,64.49],'Recto|Enveloppes blanches':[57.49,65.90,82.90,114.49],'Recto|Env. bleues / roses':[64.49,79.49,98.49,170.90],
    'Recto-Verso|Sans enveloppe':[47.49,48.90,53.90,68.90],'Recto-Verso|Enveloppes blanches':[59.49,70.49,88.49,126.49],'Recto-Verso|Env. bleues / roses':[65.90,80.90,100.49,176.49]},
 Q:[25,50,100,250],opts:{'Impression':['Recto','Recto-Verso'],'Enveloppe':['Sans enveloppe','Enveloppes blanches','Env. bleues / roses']},desc:'Format A6 • Papier Standard • J+3'},
{id:'magnet-save',nom:'Magnets Save The Date',prix:'dès 57,90 €',
 T:{'Papier Magnet 688g':[57.90,82.90,132.49,182.49,282.90,487.90]},Q:[50,100,200,300,500,1000],
 opts:{'Papier':['Papier Magnet 688g']},desc:'Format A6 • Magnet 688g/m² • J+5'},
{id:'carte-invit',nom:"Carte d'invitation / Réponse A6",prix:'dès 45,49 €',
 T:{'Recto|Sans enveloppe':[45.49,47.49,50.90,64.49],'Recto|Enveloppes blanches':[57.49,65.90,82.90,114.49],'Recto|Env. or / argent':[74.49,89.90,129.90,215.90],'Recto|Env. bleues / roses':[64.49,79.49,98.49,170.90],
    'Recto-Verso|Sans enveloppe':[47.49,48.90,53.90,69.49,82.90],'Recto-Verso|Enveloppes blanches':[59.49,67.90,88.49,119.49,164.49],'Recto-Verso|Env. or / argent':[76.49,91.90,131.49,213.49,369.90],'Recto-Verso|Env. bleues / roses':[65.90,80.90,100.49,176.49,249.49]},
 Q:[25,50,100,250,500],opts:{'Impression':['Recto','Recto-Verso'],'Enveloppe':['Sans enveloppe','Enveloppes blanches','Env. or / argent','Env. bleues / roses']},desc:'Format A6 • Papier Standard • J+3'},
{id:'menu-evt-carte',nom:'Menu Carte A5 (Sans pli)',prix:'dès 32,49 €',
 T:{'Recto-Verso 350g':[32.49,40.90,74.49,126.49,266.49]},Q:[25,100,500,1000,2500],
 opts:{'Impression':['Recto-Verso 350g']},desc:'350g Couché demi-mat • J+6'},
{id:'menu-evt-chev',nom:'Menu Chevalet (Plié 4 pages)',prix:'dès 82,90 €',
 T:{'A5 Fermé':[82.90,95.49,143.49,195.49,385.49],'A4 Fermé':[95.49,122.90,283.90,511.90,1149.90],'Carré':[95.49,122.90,281.90,506.49,1126.49]},
 Q:[25,100,500,1000,2500],opts:{'Format':['A5 Fermé','A4 Fermé','Carré']},desc:'Intérieur + extérieur imprimés • J+6'},
{id:'plan-table',nom:'Plan de Table (PVC 90×60)',prix:'dès 43,49 €',
 T:{'Coupe droite (Sans perçage)':[43.49],'Coupe droite + Perçage 4 coins':[44.90]},Q:[1],
 opts:{'Finition':['Coupe droite (Sans perçage)','Coupe droite + Perçage 4 coins']},desc:'PVC 3mm rigide • Impression HD'},
{id:'gobelet-evt',nom:'Gobelet Personnalisé 12cL/18cL',prix:'dès 47,90 €',
 T:{'Impression Quadri HD':[47.90,75.90,90.49,151.90,266.90,480.49,876.49,1211.90]},Q:[10,25,50,100,250,500,1000,2000],
 opts:{'Marquage':['Impression Quadri HD']},desc:'Plastique givré • J+12'},
{id:'panneau-bienv',nom:'Panneau de Bienvenue (PVC)',prix:'dès 36,49 €',
 T:{'40×30 cm':[36.49],'60×40 cm':[36.49],'70×50 cm':[36.49],'80×60 cm':[41.90],'120×80 cm':[53.90]},Q:[1],
 opts:{'Dimensions':['40×30 cm','60×40 cm','70×50 cm','80×60 cm','120×80 cm']},desc:'PVC 3mm • Impression Recto HD'},
{id:'beach-flag-evt',nom:'Beach Flag',prix:'dès 87,90 €',
 T:{'S (~2m30)':[87.90],'M (~3m00)':[114.90],'L (~4m00)':[151.90]},Q:[1],
 opts:{'Taille':['S (~2m30)','M (~3m00)','L (~4m00)']},desc:'Résistant au vent • Pied inclus'},
{id:'arche-gonf',nom:'Arche Gonflable',prix:'dès 559,90 €',
 T:{'3m × 3m':[559.90],'5m × 3m':[767.49]},Q:[1],
 opts:{'Format':['3m × 3m','5m × 3m']},desc:'Effet Wow • Entrée de prestige'},
{id:'transat-evt',nom:'Transat Personnalisé',prix:'dès 67,49 €',
 T:{'Sans accoudoirs':[67.49],'Avec accoudoirs':[88.49]},Q:[1],
 opts:{'Modèle':['Sans accoudoirs','Avec accoudoirs']},desc:'Bois de hêtre • Sublimation'},
{id:'rollup-evt',nom:'Roll-Up Enrouleur',prix:'dès 44,90 €',
 T:{'Eco (85×200 cm)':[44.90],'Standard (85×200 cm)':[56.49],'Large (100×200 cm)':[83.90]},Q:[1],
 opts:{'Modèle':['Eco (85×200 cm)','Standard (85×200 cm)','Large (100×200 cm)']},desc:'Structure alu • Housse incluse'},
{id:'carte-remerci',nom:'Carte de Remerciement A6',prix:'dès 45,90 €',
 T:{'Recto|Sans enveloppe':[45.90,47.49,50.90,64.49],'Recto|Enveloppes blanches':[57.49,65.90,82.90,114.49],'Recto|Env. bleues / roses':[64.49,79.49,98.49,170.90],
    'Recto-Verso|Sans enveloppe':[47.49,48.90,53.90,68.90],'Recto-Verso|Enveloppes blanches':[59.49,70.49,88.49,126.49],'Recto-Verso|Env. bleues / roses':[65.90,80.90,100.49,176.49]},
 Q:[25,50,100,250],opts:{'Impression':['Recto','Recto-Verso'],'Enveloppe':['Sans enveloppe','Enveloppes blanches','Env. bleues / roses']},desc:'Papier Standard • J+3'},
{id:'totebag-evt',nom:'Tote Bag Carolina (Coton)',prix:'dès 52,90 €',
 T:{'Impression Recto':[52.90],'Impression Recto / Verso':[79.90]},Q:[1],
 opts:{'Marquage':['Impression Recto','Impression Recto / Verso']},desc:'100% Coton • Quadri HD'}
],
"comperso2":[],
"comext2":[]
};

// ===== STATE =====
var panier=[], fichiers={}, uid=0, catCur=null;
var currentStep=1;
var stripeReturnStep=4;
var ADMIN_PWD='comimpression2025';
var API_BASE=window.CI_API_BASE||window.location.origin;
var incidentState={ active:false, title:'', message:'', updatedAt:'' };

function normalizeIncidentState(raw) {
  return {
    active: !!(raw && raw.active),
    title: (raw && raw.title) || '',
    message: (raw && raw.message) || '',
    updatedAt: (raw && (raw.updatedAt || raw.updated_at)) || ''
  };
}

function getPayableItems() {
  return panier.filter(function(i){
    return i.prix!=='Sur devis' && i.prix.indexOf('Entrez')<0;
  });
}

function majActionCommande() {
  var btn=document.getElementById('btn-send');
  if(!btn) return;
  btn.textContent=getPayableItems().length>0?'💳 Passer au paiement':'✉️ Envoyer ma commande';
}

function ensureIncidentPopup() {
  if(document.getElementById('ci-incident-popup')) return;
  var wrap=document.createElement('div');
  wrap.id='ci-incident-popup';
  wrap.className='moverlay';
  wrap.style.zIndex='9700';
  wrap.innerHTML=
    '<div class="mbox" style="max-width:520px;border-color:#dc2626;box-shadow:8px 8px 0 #7f1d1d;">'
    +'<div class="mhead" style="background:#dc2626;"><h2 id="ci-incident-title">Information importante</h2><button class="mbtn-close" id="ci-incident-close">✕</button></div>'
    +'<div class="mbody">'
    +'<p id="ci-incident-message" style="font-size:.92rem;line-height:1.7;color:#444;margin:0 0 16px;"></p>'
    +'<div style="display:flex;justify-content:flex-end;"><button id="ci-incident-ok" class="btn-or" style="background:#dc2626;box-shadow:0 4px 0 #991b1b;">J\'ai compris</button></div>'
    +'</div></div>';
  document.body.appendChild(wrap);

  function closeIncidentPopup() {
    wrap.classList.remove('open');
  }
  var closeBtn=document.getElementById('ci-incident-close');
  var okBtn=document.getElementById('ci-incident-ok');
  if(closeBtn) closeBtn.addEventListener('click', closeIncidentPopup);
  if(okBtn) okBtn.addEventListener('click', closeIncidentPopup);
  wrap.addEventListener('click', function(e){ if(e.target===wrap) closeIncidentPopup(); });
}

function appliquerIncidentUi() {
  var popup=document.getElementById('ci-incident-popup');
  if(popup) popup.classList.remove('open');
}

function syncAdminIncidentForm() {
  return;
}

function chargerIncidentState(silent) {
  incidentState=normalizeIncidentState({ active:false, title:'', message:'', updatedAt:'' });
  appliquerIncidentUi();
  return Promise.resolve(incidentState);
}

function sauverIncidentStateServer(nextState) {
  incidentState=normalizeIncidentState({ active:false, title:'', message:'', updatedAt:'' });
  appliquerIncidentUi();
  return Promise.resolve(incidentState);
}

function injecterBlocIncidentAdmin() {
  return;
}

// ===== PRIX =====
function calcPrix(prod,sels,qte,larg,haut){
  if(prod.id==='kakemono'){ var fmt=sels['Format']||'60x160 cm'; var p=TKAK[fmt]; return p?p.toFixed(2).replace('.',',')+' €':'Sur devis'; }
  var DIM_PRODS=['bache-ss-oe','bache-av-oe','bache-micro','tissu-fourreau','akylux-ss','akylux-av','panneau-immo','plaque-aimant','adhesif-vinyle'];
  if(DIM_PRODS.indexOf(prod.id)>-1&&prod.dimsLibres){
    var lm=parseFloat(larg)||0,hm=parseFloat(haut)||0;
    if(lm<50||hm<50) return (lm>0||hm>0)?'Min 50×50 cm':'Entrez les dimensions (cm)';
    if(!prod.T) return 'Sur devis';
    var surf=(lm/100)*(hm/100);
    var fmts=[{key:'100x100',s:1},{key:'200x200',s:4},{key:'300x300',s:9},{key:'400x400',s:16}];
    var tbl=prod.T;
    if(prod.id==='bache-micro') tbl=(sels['Finition']||'').indexOf('illets')>-1?TBACHE_MICRO_OE:TBACHE_MICRO;
    var tier=null;
    for(var fi=0;fi<fmts.length;fi++){ if(surf<=fmts[fi].s){tier=fmts[fi];break;} }
    if(!tier) return 'Sur devis (>16m²)';
    var prixFmt=tbl[tier.key]; if(!prixFmt) return 'Sur devis';
    var prixM2=prixFmt/tier.s, prixFinal=prixM2*surf;
    var prixMin=tbl['100x100']||prixFmt; if(prixFinal<prixMin) prixFinal=prixMin;
    return prixFinal.toFixed(2).replace('.',',')+' € TTC ('+surf.toFixed(2)+' m²)';
  }
  // Produits services à prix unitaire (plastification, photos)
  if(prod.prixUnit){
    var nbU=parseInt(qte)||1;
    var total=prod.prixUnit*nbU;
    return total.toFixed(2).replace('.',',')+' € TTC ('+prod.prixUnit.toFixed(2).replace('.',',')+'€/u × '+nbU+')';
  }
  if(prod.id==='impression-doc'){
    var nbp=parseInt(qte)||1;
    var gr=(sels['Grammage']||'80g').indexOf('90')>-1?'90g':'80g';
    var coul=(sels['Couleur']||'Noir & Blanc').indexOf('ouleur')>-1?'Col':'N&B';
    var imp=(sels['Impression']||'Recto')==='Recto-Verso'?'RV':'Recto';
    var kd=gr+'|'+coul+'|'+imp;
    var td=prod.T[kd]||prod.T['80g|N&B|Recto'];
    var pu=td[td.length-1];
    for(var qi=0;qi<prod.Q.length;qi++){if(nbp>=prod.Q[qi]&&nbp<(prod.Q[qi+1]||Infinity)){pu=td[qi];break;}}
    return (pu*nbp).toFixed(2).replace('.',',')+' € TTC ('+pu.toString().replace('.',',')+'€/page × '+nbp+' pages)';
  }
  if(prod.id==='affiche'&&prod.prixSpecial){
    var fmt2=sels['Format']||'A4',imp2=sels['Impression']||'Recto';
    var tblA={'A4':TAF_A4,'A3':TAF_A3,'A2':TAF_A2,'A1':TAF_A1,'A0':TAF_A0}[fmt2];
    if(!tblA) return 'Sur devis';
    var data=tblA[imp2]||(fmt2==='A0'?tblA['Recto']:null); if(!data) return 'Sur devis';
    var q=parseInt(qte)||0; var idx=data.Q.indexOf(q); if(idx<0) return 'Sur devis';
    return data.P[idx].toFixed(2).replace('.',',')+' € TTC';
  }
  if(prod.id==='menu-resto'&&prod.prixSpecial){
    var fmt3=sels['Format']||'Simple A4',imp3=sels['Impression']||'Recto';
    var tblM={'Simple A5':TMENU_A5,'Simple A4':TMENU_A4,'Dépliant A4 (1 pli)':TMENU_DEP_A4,'Dépliant A3 (1 pli)':TMENU_DEP_A3}[fmt3];
    if(!tblM) return 'Sur devis';
    var q3=parseInt(qte)||0; var idx3=tblM.Q.indexOf(q3); if(idx3<0) return 'Sur devis';
    var prix3=tblM[imp3]||tblM['Recto-Verso']||tblM[Object.keys(tblM).filter(function(k){return k!=='Q';})[0]]; if(!prix3) return 'Sur devis';
    return prix3[idx3].toFixed(2).replace('.',',')+' € TTC';
  }
  if(prod.id==='barr-std'||prod.id==='barr-long'){
    var fmtB=sels['Format']||Object.keys(prod.T)[0];
    var tblB=prod.T[fmtB]; if(!tblB) return 'Sur devis';
    var idxB=(prod.Q||QBARR).indexOf(parseInt(qte)); if(idxB<0) return 'Sur devis';
    return tblB[idxB].toFixed(2).replace('.',',')+' € TTC';
  }
  if(prod.id==='rollup-ext'){
    var faceV=sels['Face']||'Recto seul';
    var tblR=faceV.indexOf('Verso')>-1?TROLLUP_RV:TROLLUP_R;
    var idxR=QROLLUP.indexOf(parseInt(qte)); if(idxR<0) return 'Sur devis';
    return tblR[idxR].toFixed(2).replace('.',',')+' € TTC';
  }
  if(prod.id==='beach-flag'){
    var htV=sels['Hauteur']||'2,03m';
    var tblBF=TBEACH[htV]; if(!tblBF) return 'Sur devis';
    var idxBF=QBEACH.indexOf(parseInt(qte)); if(idxBF<0) return 'Sur devis';
    return tblBF[idxBF].toFixed(2).replace('.',',')+' € TTC';
  }
  if(prod.id==='stop-trottoir'){
    var modST=sels['Modèle']||'Éco (structure légère)';
    var matST=sels['Matière']||'Bâche 510g';
    var tblST=modST.indexOf('mbase')>-1?TSTOP_EMB:TSTOP_ECO;
    var rowST=tblST[matST]; if(!rowST) return 'Sur devis';
    var idxST=QSTOP.indexOf(parseInt(qte)); if(idxST<0) return 'Sur devis';
    return rowST[idxST].toFixed(2).replace('.',',')+' € TTC';
  }
  if(prod.id==='arche-drapeau'){
    var fmtA=sels['Format']||'370cm';
    var typeA=sels['Type']||'Complète (structure+pieds)';
    var tblAD=typeA.indexOf('assort')>-1?TARCHE_REA:TARCHE_CPL;
    var rowAD=tblAD[fmtA]; if(!rowAD) return 'Sur devis';
    var idxAD=QARCHE.indexOf(parseInt(qte)); if(idxAD<0) return 'Sur devis';
    return rowAD[idxAD].toFixed(2).replace('.',',')+' € TTC';
  }
  if(prod.id==='barnum'&&prod.T===null){
    var idxBN=QBARNUM.indexOf(parseInt(qte)); if(idxBN<0) return 'Sur devis';
    return TBARNUM[idxBN].toFixed(2).replace('.',',')+' € TTC';
  }
  if(prod.id==='paravent'){ var idxPV=QPARAV.indexOf(parseInt(qte)); if(idxPV<0) return 'Sur devis'; return TPARAV[idxPV].toFixed(2).replace('.',',')+' € TTC'; }
  if(prod.id==='transat'){ var idxTR=QTRANSAT.indexOf(parseInt(qte)); if(idxTR<0) return 'Sur devis'; return TTRANSAT[idxTR].toFixed(2).replace('.',',')+' € TTC'; }
  if(prod.id==='chaise-cinema'){ var idxCH=QCHAISE.indexOf(parseInt(qte)); if(idxCH<0) return 'Sur devis'; return TCHAISE[idxCH].toFixed(2).replace('.',',')+' € TTC'; }
  if(prod.id==='parasol'){ var modPS=sels['Modèle']||'Sans embase'; var tblPS=modPS.indexOf('ied')>-1?TPARASOL_AV:TPARASOL_SS; var idxPS=QPARASOL.indexOf(parseInt(qte)); if(idxPS<0) return 'Sur devis'; return tblPS[idxPS].toFixed(2).replace('.',',')+' € TTC'; }
  if(prod.id==='colonne-gonf'){ var modCG=sels['Modèle']||'Sans gonfleur'; var tblCG=modCG.indexOf('onfleur')>-1&&modCG.indexOf('vec')>-1?TCOLONNE_AV:TCOLONNE_SS; var idxCG=QCOLONNE.indexOf(parseInt(qte)); if(idxCG<0) return 'Sur devis'; return tblCG[idxCG].toFixed(2).replace('.',',')+' € TTC'; }
  if(prod.id==='alu-dibond-ss'||prod.id==='alu-dibond-av'){ var fmtAL=(sels['Format']||'20x20 cm').replace(' cm',''); var tblAL=prod.id==='alu-dibond-av'?TALUDIO_AV:TALUDIO_SS; var rowAL=tblAL[fmtAL]; if(!rowAL) return 'Sur devis'; var idxAL=QALUDIO.indexOf(parseInt(qte)); if(idxAL<0) return 'Sur devis'; return rowAL[idxAL].toFixed(2).replace('.',',')+' € TTC'; }
  if(prod.id==='panneau-permis') return '45,90 € TTC';
  // ── COM'Événementiel: produits avec clé Impression|Enveloppe ──
  var EVT_PIPE=['faire-part-a5','faire-part-a6-evt','carte-invit','carte-remerci'];
  if(EVT_PIPE.indexOf(prod.id)>-1){
    var impE=sels['Impression']||'Recto',envE=sels['Enveloppe']||'Sans enveloppe';
    var keyE=impE+'|'+envE,tblE=prod.T[keyE]; if(!tblE) return 'Sur devis';
    var q2E=parseInt(qte)||0,idx2E=prod.Q.indexOf(q2E); if(idx2E<0||!tblE[idx2E]) return 'Sur devis';
    return tblE[idx2E].toFixed(2).replace('.',',')+' € TTC';
  }
  // ── COM'Événementiel: produits avec clé simple (1 option) ──
  var EVT_KEY1={'faire-part-pli':'Finition','magnet-save':'Papier','menu-evt-carte':'Impression',
    'menu-evt-chev':'Format','plan-table':'Finition','gobelet-evt':'Marquage','panneau-bienv':'Dimensions',
    'beach-flag-evt':'Taille','arche-gonf':'Format','transat-evt':'Modèle','rollup-evt':'Modèle',
    'totebag-evt':'Marquage'};
  if(EVT_KEY1[prod.id]){
    var optK=EVT_KEY1[prod.id],keyS=sels[optK]||Object.keys(prod.T)[0];
    var tblS=prod.T[keyS]; if(!tblS) return 'Sur devis';
    var q2S=parseInt(qte)||0,idx2S=prod.Q.indexOf(q2S); if(idx2S<0||!tblS[idx2S]) return 'Sur devis';
    return tblS[idx2S].toFixed(2).replace('.',',')+' € TTC';
  }
  if(!prod.T||!prod.Q||!qte||qte==='autre') return 'Sur devis';
  var q2=parseInt(qte)||0; var idx2=prod.Q.indexOf(q2); if(idx2<0) return 'Sur devis';
  var key='';
  if(prod.id==='carte-cd'||prod.id==='carte-ca'||prod.id==='carte-a6'||prod.id==='carte-fidel'||prod.id==='carte-fidel-pliee') key=sels['Impression']||'Recto';
  else if(prod.id==='flyer-a5'||prod.id==='flyer-a6') key=sels['Impression']||'Recto';
  else if(prod.id==='depliant') key=sels['Format']||Object.keys(prod.T)[0];
  else if(prod.id==='brochure-a4'||prod.id==='brochure-a5') key=sels['Pages']||'8p';
  else if(prod.id==='chemise-a4'||prod.id==='chemise-a5') key=sels['Impression']||'Recto';
  else if(prod.id==='fairepart-a6'||prod.id==='fairepart-a5') key=sels['Enveloppe']||'Sans enveloppe';
  else if(prod.id==='sac-kraft-bt'||prod.id==='sac-kraft-24') key=sels['Variante']||Object.keys(prod.T)[0];
  else if(prod.id==='enveloppe') key=sels['Format']||'DL sans fenêtre';
  else if(prod.id==='set-table'||prod.id==='accroche-porte') key=sels['Impression']||'Recto';
  else if(prod.id==='chevalet') key=sels['Format']||'A6 Portrait';
  else if(prod.id==='livre-photo') key=sels['Format']||'A5 (Portrait/Paysage)';
  else if(prod.id==='tshirt'||prod.id==='tshirt-broderie'||prod.id==='polo'||prod.id==='veste'||prod.id==='chemise'||prod.id==='casquette'||prod.id==='casquette-broderie'||prod.id==='totebag'){
    key=sels['Marquage']||Object.keys(prod.T)[0];
  }
  else if(prod.id==='gobelet'){
    key='Impression Quadrichromie';
  }
  else key=Object.keys(prod.T)[0];
  var p2=prod.T[key]; if(!p2) return 'Sur devis';
  return p2[idx2].toFixed(2).replace('.',',')+' € TTC';
}

// ===== STEPS =====
function goStep(n){
  if(typeof n==='number') currentStep=n;
  document.querySelectorAll('.spanel').forEach(function(p){p.classList.remove('on');});
  var id=n==='ok'?'sp-ok':'sp'+n;
  var el=document.getElementById(id); if(el) el.classList.add('on');
  [1,2,3,4].forEach(function(i){
    var d=document.getElementById('sd'+i); if(!d) return;
    d.classList.remove('active','done');
    if(i<n) d.classList.add('done'); else if(i===n) d.classList.add('active');
    var l=document.getElementById('sl'+i+(i+1)); if(l) l.classList.toggle('done',i<n);
  });
  if(n===3) majRecap();
  majActionCommande();
}

function ouvrirModal(){ document.getElementById('m-pc').classList.add('open'); goStep(1); }
function fermerModal(){ document.getElementById('m-pc').classList.remove('open'); }
function ouvrirPanier(){ var mpc=document.getElementById('m-pc'); if(!mpc) return; mpc.classList.add('open'); if(typeof goStep==='function') goStep((panier&&panier.length>0)?3:1); }

// ===== ICONES PRODUITS (SVG colorés) =====
function getProdIcon(id, cat) {
  var COLORS = {
    compro: {bg:'#FFF5EC', ic:'#F47B20'},
    comext: {bg:'#EFF6FF', ic:'#3B82F6'},
    comperso: {bg:'#F0FDF4', ic:'#22C55E'},
    comservices: {bg:'#FDF4FF', ic:'#A855F7'},
    comevt: {bg:'#FFF1F2', ic:'#F43F5E'}
  };
  var c = COLORS[cat] || COLORS.compro;
  var bg = c.bg, ic = c.ic;

  var shapes = {
    // ── COM'PRO ──
    'carte-cd':'<rect x="3" y="6" width="18" height="12" rx="1.5" fill="'+bg+'"/><rect x="3" y="6" width="18" height="12" rx="1.5" stroke="'+ic+'" stroke-width="1.5" fill="none"/><circle cx="7" cy="10" r="2" fill="'+ic+'" opacity=".3"/><line x1="11" y1="9" x2="18" y2="9" stroke="'+ic+'" stroke-width="1.2"/><line x1="11" y1="12" x2="16" y2="12" stroke="'+ic+'" stroke-width="1" opacity=".5"/><line x1="5" y1="15" x2="10" y2="15" stroke="'+ic+'" stroke-width=".8" opacity=".4"/>',
    'carte-ca':'<rect x="3" y="6" width="18" height="12" rx="4" fill="'+bg+'"/><rect x="3" y="6" width="18" height="12" rx="4" stroke="'+ic+'" stroke-width="1.5" fill="none"/><circle cx="7" cy="10" r="2" fill="'+ic+'" opacity=".3"/><line x1="11" y1="9" x2="18" y2="9" stroke="'+ic+'" stroke-width="1.2"/><line x1="11" y1="12" x2="16" y2="12" stroke="'+ic+'" stroke-width="1" opacity=".5"/>',
    'carte-a6':'<rect x="2" y="4" width="20" height="16" rx="2" fill="'+bg+'"/><rect x="2" y="4" width="20" height="16" rx="2" stroke="'+ic+'" stroke-width="1.5" fill="none"/><rect x="5" y="7" width="6" height="4" rx="1" fill="'+ic+'" opacity=".25"/><line x1="5" y1="14" x2="19" y2="14" stroke="'+ic+'" stroke-width="1" opacity=".5"/><line x1="5" y1="17" x2="14" y2="17" stroke="'+ic+'" stroke-width=".8" opacity=".4"/>',
    'flyer-a5':'<rect x="4" y="2" width="16" height="20" rx="2" fill="'+bg+'"/><rect x="4" y="2" width="16" height="20" rx="2" stroke="'+ic+'" stroke-width="1.5" fill="none"/><rect x="7" y="5" width="10" height="6" rx="1" fill="'+ic+'" opacity=".2"/><line x1="7" y1="14" x2="17" y2="14" stroke="'+ic+'" stroke-width="1"/><line x1="7" y1="17" x2="14" y2="17" stroke="'+ic+'" stroke-width=".8" opacity=".5"/>',
    'flyer-a6':'<rect x="5" y="3" width="14" height="18" rx="2" fill="'+bg+'"/><rect x="5" y="3" width="14" height="18" rx="2" stroke="'+ic+'" stroke-width="1.5" fill="none"/><rect x="8" y="6" width="8" height="5" rx="1" fill="'+ic+'" opacity=".2"/><line x1="8" y1="14" x2="16" y2="14" stroke="'+ic+'" stroke-width="1"/><line x1="8" y1="17" x2="13" y2="17" stroke="'+ic+'" stroke-width=".8" opacity=".5"/>',
    'depliant':'<rect x="2" y="4" width="20" height="16" rx="1" fill="'+bg+'"/><rect x="2" y="4" width="20" height="16" rx="1" stroke="'+ic+'" stroke-width="1.5" fill="none"/><line x1="9.3" y1="4" x2="9.3" y2="20" stroke="'+ic+'" stroke-width="1.2" stroke-dasharray="2 1.5"/><line x1="16.6" y1="4" x2="16.6" y2="20" stroke="'+ic+'" stroke-width="1.2" stroke-dasharray="2 1.5"/>',
    'brochure-a4':'<rect x="6" y="3" width="14" height="18" rx="1" fill="'+bg+'"/><rect x="6" y="3" width="14" height="18" rx="1" stroke="'+ic+'" stroke-width="1.3" fill="none"/><rect x="4" y="4" width="14" height="18" rx="1" fill="'+bg+'" opacity=".6"/><rect x="4" y="4" width="14" height="18" rx="1" stroke="'+ic+'" stroke-width="1.5" fill="none"/><circle cx="4" cy="10" r="1" fill="'+ic+'"/><circle cx="4" cy="16" r="1" fill="'+ic+'"/><line x1="7" y1="8" x2="15" y2="8" stroke="'+ic+'" stroke-width="1" opacity=".5"/><line x1="7" y1="11" x2="15" y2="11" stroke="'+ic+'" stroke-width=".8" opacity=".4"/>',
    'brochure-a5':'<rect x="7" y="4" width="12" height="16" rx="1" fill="'+bg+'"/><rect x="7" y="4" width="12" height="16" rx="1" stroke="'+ic+'" stroke-width="1.3" fill="none"/><rect x="5" y="5" width="12" height="16" rx="1" fill="'+bg+'" opacity=".6"/><rect x="5" y="5" width="12" height="16" rx="1" stroke="'+ic+'" stroke-width="1.5" fill="none"/><circle cx="5" cy="11" r="1" fill="'+ic+'"/><circle cx="5" cy="16" r="1" fill="'+ic+'"/><line x1="8" y1="9" x2="14" y2="9" stroke="'+ic+'" stroke-width="1" opacity=".5"/>',
    'affiche':'<rect x="4" y="2" width="16" height="20" rx="1" fill="'+bg+'"/><rect x="4" y="2" width="16" height="20" rx="1" stroke="'+ic+'" stroke-width="1.5" fill="none"/><rect x="7" y="5" width="10" height="8" rx="1" fill="'+ic+'" opacity=".2"/><circle cx="14" cy="9" r="2" fill="'+ic+'" opacity=".35"/><path d="M7 11L10 8L13 10L15 8L17 11V13H7Z" fill="'+ic+'" opacity=".25"/><line x1="7" y1="16" x2="17" y2="16" stroke="'+ic+'" stroke-width="1.5"/><line x1="7" y1="19" x2="13" y2="19" stroke="'+ic+'" stroke-width="1" opacity=".5"/>',
    'chemise-a4':'<path d="M4 3H18V21H4V3Z" fill="'+bg+'"/><path d="M4 3H18V21H4V3Z" stroke="'+ic+'" stroke-width="1.5" fill="none"/><path d="M18 15L18 21H12L18 15Z" fill="'+ic+'" opacity=".25"/><path d="M18 15L18 21H12L18 15Z" stroke="'+ic+'" stroke-width="1" fill="none"/><line x1="7" y1="7" x2="15" y2="7" stroke="'+ic+'" stroke-width="1" opacity=".4"/><line x1="7" y1="10" x2="15" y2="10" stroke="'+ic+'" stroke-width=".8" opacity=".3"/>',
    'chemise-a5':'<path d="M5 4H17V20H5V4Z" fill="'+bg+'"/><path d="M5 4H17V20H5V4Z" stroke="'+ic+'" stroke-width="1.5" fill="none"/><path d="M17 14L17 20H11L17 14Z" fill="'+ic+'" opacity=".25"/><path d="M17 14L17 20H11L17 14Z" stroke="'+ic+'" stroke-width="1" fill="none"/><line x1="8" y1="8" x2="14" y2="8" stroke="'+ic+'" stroke-width="1" opacity=".4"/>',
    'fairepart-a6':'<rect x="4" y="5" width="16" height="14" rx="2" fill="'+bg+'"/><rect x="4" y="5" width="16" height="14" rx="2" stroke="'+ic+'" stroke-width="1.5" fill="none"/><path d="M7 8Q12 13 17 8" stroke="'+ic+'" stroke-width="1.5" fill="none"/><circle cx="12" cy="14" r="2.5" fill="'+ic+'" opacity=".2"/>',
    'fairepart-a5':'<rect x="3" y="4" width="18" height="16" rx="2" fill="'+bg+'"/><rect x="3" y="4" width="18" height="16" rx="2" stroke="'+ic+'" stroke-width="1.5" fill="none"/><path d="M6 7Q12 13 18 7" stroke="'+ic+'" stroke-width="1.5" fill="none"/><circle cx="12" cy="14" r="3" fill="'+ic+'" opacity=".2"/>',
    'carte-fidel':'<rect x="3" y="6" width="18" height="12" rx="2" fill="'+bg+'"/><rect x="3" y="6" width="18" height="12" rx="2" stroke="'+ic+'" stroke-width="1.5" fill="none"/><circle cx="7" cy="13" r="1.5" fill="'+ic+'" opacity=".6"/><circle cx="11" cy="13" r="1.5" fill="'+ic+'" opacity=".6"/><circle cx="15" cy="13" r="1.5" fill="'+ic+'" opacity=".6"/><circle cx="19" cy="13" r="1.5" stroke="'+ic+'" stroke-width="1" fill="none" opacity=".4"/>',
    'carte-fidel-pliee':'<rect x="2" y="6" width="10" height="12" rx="1.5" fill="'+bg+'"/><rect x="2" y="6" width="10" height="12" rx="1.5" stroke="'+ic+'" stroke-width="1.3" fill="none"/><rect x="12" y="6" width="10" height="12" rx="1.5" fill="'+bg+'"/><rect x="12" y="6" width="10" height="12" rx="1.5" stroke="'+ic+'" stroke-width="1.5" fill="none"/><line x1="12" y1="6" x2="12" y2="18" stroke="'+ic+'" stroke-width="1" stroke-dasharray="2 1"/><circle cx="5" cy="13" r="1.2" fill="'+ic+'" opacity=".5"/><circle cx="8" cy="13" r="1.2" fill="'+ic+'" opacity=".5"/><circle cx="15" cy="13" r="1.2" fill="'+ic+'" opacity=".5"/><circle cx="18" cy="13" r="1.2" stroke="'+ic+'" stroke-width=".8" fill="none" opacity=".4"/>',
    'sac-kraft-bt':'<path d="M8 4H16L17.5 22H6.5Z" fill="'+bg+'"/><path d="M8 4H16L17.5 22H6.5Z" stroke="'+ic+'" stroke-width="1.5" fill="none"/><path d="M8 4Q8 2 12 2Q16 2 16 4" stroke="'+ic+'" stroke-width="1.2" fill="none"/><line x1="12" y1="4" x2="12" y2="8" stroke="'+ic+'" stroke-width="1" opacity=".4"/><ellipse cx="12" cy="15" rx="3" ry="4" stroke="'+ic+'" stroke-width=".8" fill="none" opacity=".3"/>',
    'sac-kraft-24':'<path d="M5 5H19L20 22H4Z" fill="'+bg+'"/><path d="M5 5H19L20 22H4Z" stroke="'+ic+'" stroke-width="1.5" fill="none"/><path d="M5 5Q5 3 12 3Q19 3 19 5" stroke="'+ic+'" stroke-width="1.2" fill="none"/><line x1="9" y1="5" x2="9" y2="9" stroke="'+ic+'" stroke-width="1" opacity=".4"/><line x1="15" y1="5" x2="15" y2="9" stroke="'+ic+'" stroke-width="1" opacity=".4"/>',
    'enveloppe':'<rect x="2" y="5" width="20" height="14" rx="2" fill="'+bg+'"/><rect x="2" y="5" width="20" height="14" rx="2" stroke="'+ic+'" stroke-width="1.5" fill="none"/><path d="M2 5L12 13L22 5" stroke="'+ic+'" stroke-width="1.5" fill="none"/><line x1="2" y1="19" x2="8" y2="13" stroke="'+ic+'" stroke-width="1" opacity=".3"/><line x1="22" y1="19" x2="16" y2="13" stroke="'+ic+'" stroke-width="1" opacity=".3"/>',
    'menu-resto':'<rect x="4" y="2" width="16" height="20" rx="2" fill="'+bg+'"/><rect x="4" y="2" width="16" height="20" rx="2" stroke="'+ic+'" stroke-width="1.5" fill="none"/><line x1="8" y1="6" x2="16" y2="6" stroke="'+ic+'" stroke-width="1.5"/><line x1="7" y1="10" x2="12" y2="10" stroke="'+ic+'" stroke-width=".8" opacity=".5"/><line x1="14" y1="10" x2="17" y2="10" stroke="'+ic+'" stroke-width=".8" opacity=".5"/><line x1="7" y1="13" x2="11" y2="13" stroke="'+ic+'" stroke-width=".8" opacity=".5"/><line x1="14" y1="13" x2="17" y2="13" stroke="'+ic+'" stroke-width=".8" opacity=".5"/><line x1="7" y1="16" x2="13" y2="16" stroke="'+ic+'" stroke-width=".8" opacity=".5"/><line x1="15" y1="16" x2="17" y2="16" stroke="'+ic+'" stroke-width=".8" opacity=".5"/>',
    'set-table':'<rect x="2" y="6" width="20" height="14" rx="3" fill="'+bg+'"/><rect x="2" y="6" width="20" height="14" rx="3" stroke="'+ic+'" stroke-width="1.5" fill="none"/><circle cx="12" cy="13" r="4" stroke="'+ic+'" stroke-width="1" fill="none" opacity=".5"/><line x1="6" y1="9" x2="6" y2="17" stroke="'+ic+'" stroke-width="1" opacity=".3"/><line x1="18" y1="9" x2="18" y2="17" stroke="'+ic+'" stroke-width="1" opacity=".3"/>',
    'accroche-porte':'<path d="M8 2H16V22H8V2Z" fill="'+bg+'"/><path d="M8 2H16V22H8V2Z" stroke="'+ic+'" stroke-width="1.5" fill="none"/><circle cx="12" cy="5.5" r="2.5" fill="'+ic+'" opacity=".15"/><path d="M10 5.5A2 2 0 0114 5.5" stroke="'+ic+'" stroke-width="1.2" fill="none"/><line x1="10" y1="10" x2="14" y2="10" stroke="'+ic+'" stroke-width="1" opacity=".5"/><line x1="10" y1="12.5" x2="14" y2="12.5" stroke="'+ic+'" stroke-width=".8" opacity=".4"/><line x1="10" y1="15" x2="14" y2="15" stroke="'+ic+'" stroke-width=".8" opacity=".3"/>',
    'chevalet':'<path d="M5 20L12 4L19 20" stroke="'+ic+'" stroke-width="1.5" fill="none"/><rect x="6" y="6" width="12" height="10" rx="1" fill="'+bg+'"/><rect x="6" y="6" width="12" height="10" rx="1" stroke="'+ic+'" stroke-width="1.5" fill="none"/><line x1="9" y1="10" x2="15" y2="10" stroke="'+ic+'" stroke-width="1" opacity=".5"/><line x1="9" y1="13" x2="13" y2="13" stroke="'+ic+'" stroke-width=".8" opacity=".4"/>',
    'livre-photo':'<rect x="5" y="3" width="15" height="18" rx="2" fill="'+bg+'"/><path d="M5 5A2 2 0 013 7V19A2 2 0 005 21" stroke="'+ic+'" stroke-width="1.5" fill="none"/><rect x="5" y="3" width="15" height="18" rx="2" stroke="'+ic+'" stroke-width="1.5" fill="none"/><rect x="8" y="6" width="9" height="6" rx="1" fill="'+ic+'" opacity=".2"/><path d="M8 10L10 8L12 9.5L14 7L17 10V12H8Z" fill="'+ic+'" opacity=".3"/><circle cx="15" cy="8" r="1" fill="'+ic+'" opacity=".3"/>',
    // ── COM\'EXTÉRIEUR ──
    'bache-ss-oe':'<rect x="2" y="6" width="20" height="12" rx="1" fill="'+bg+'"/><rect x="2" y="6" width="20" height="12" rx="1" stroke="'+ic+'" stroke-width="1.5" fill="none"/><path d="M6 9L10 14L14 10L18 15" stroke="'+ic+'" stroke-width="1" opacity=".3" fill="none"/>',
    'bache-av-oe':'<rect x="2" y="6" width="20" height="12" rx="1" fill="'+bg+'"/><rect x="2" y="6" width="20" height="12" rx="1" stroke="'+ic+'" stroke-width="1.5" fill="none"/><circle cx="4" cy="8" r="1.3" fill="'+ic+'" opacity=".6"/><circle cx="20" cy="8" r="1.3" fill="'+ic+'" opacity=".6"/><circle cx="4" cy="16" r="1.3" fill="'+ic+'" opacity=".6"/><circle cx="20" cy="16" r="1.3" fill="'+ic+'" opacity=".6"/>',
    'bache-micro':'<rect x="2" y="5" width="20" height="14" rx="1" fill="'+bg+'"/><rect x="2" y="5" width="20" height="14" rx="1" stroke="'+ic+'" stroke-width="1.5" fill="none"/><circle cx="7" cy="9" r=".7" fill="'+ic+'" opacity=".3"/><circle cx="10" cy="9" r=".7" fill="'+ic+'" opacity=".3"/><circle cx="13" cy="9" r=".7" fill="'+ic+'" opacity=".3"/><circle cx="16" cy="9" r=".7" fill="'+ic+'" opacity=".3"/><circle cx="7" cy="12" r=".7" fill="'+ic+'" opacity=".3"/><circle cx="10" cy="12" r=".7" fill="'+ic+'" opacity=".3"/><circle cx="13" cy="12" r=".7" fill="'+ic+'" opacity=".3"/><circle cx="16" cy="12" r=".7" fill="'+ic+'" opacity=".3"/><circle cx="7" cy="15" r=".7" fill="'+ic+'" opacity=".3"/><circle cx="10" cy="15" r=".7" fill="'+ic+'" opacity=".3"/><circle cx="13" cy="15" r=".7" fill="'+ic+'" opacity=".3"/><circle cx="16" cy="15" r=".7" fill="'+ic+'" opacity=".3"/>',
    'tissu-fourreau':'<rect x="3" y="4" width="18" height="16" rx="1" fill="'+bg+'"/><rect x="3" y="4" width="18" height="16" rx="1" stroke="'+ic+'" stroke-width="1.5" fill="none"/><path d="M3 6H5V18H3" stroke="'+ic+'" stroke-width="1.2" fill="'+ic+'" opacity=".2"/><path d="M21 6H19V18H21" stroke="'+ic+'" stroke-width="1.2" fill="'+ic+'" opacity=".2"/>',
    'adhesif-vinyle':'<rect x="3" y="3" width="18" height="18" rx="2" fill="'+bg+'"/><rect x="3" y="3" width="18" height="18" rx="2" stroke="'+ic+'" stroke-width="1.5" fill="none"/><path d="M16 3L16 8L21 3" stroke="'+ic+'" stroke-width="1" fill="'+ic+'" opacity=".25"/><line x1="7" y1="11" x2="14" y2="11" stroke="'+ic+'" stroke-width="1" opacity=".4"/><line x1="7" y1="14" x2="12" y2="14" stroke="'+ic+'" stroke-width=".8" opacity=".3"/>',
    'barr-std':'<line x1="3" y1="8" x2="3" y2="20" stroke="'+ic+'" stroke-width="2"/><line x1="21" y1="8" x2="21" y2="20" stroke="'+ic+'" stroke-width="2"/><line x1="3" y1="8" x2="21" y2="8" stroke="'+ic+'" stroke-width="1.5"/><line x1="3" y1="14" x2="21" y2="14" stroke="'+ic+'" stroke-width="1"/><rect x="3" y="8" width="18" height="6" fill="'+bg+'" opacity=".6"/><rect x="3" y="8" width="18" height="6" stroke="'+ic+'" stroke-width="1.5" fill="none"/><line x1="8" y1="10" x2="16" y2="10" stroke="'+ic+'" stroke-width="1" opacity=".5"/>',
    'barr-long':'<line x1="2" y1="8" x2="2" y2="20" stroke="'+ic+'" stroke-width="2"/><line x1="22" y1="8" x2="22" y2="20" stroke="'+ic+'" stroke-width="2"/><line x1="2" y1="8" x2="22" y2="8" stroke="'+ic+'" stroke-width="1.5"/><line x1="2" y1="14" x2="22" y2="14" stroke="'+ic+'" stroke-width="1"/><rect x="2" y="8" width="20" height="6" fill="'+bg+'" opacity=".6"/><rect x="2" y="8" width="20" height="6" stroke="'+ic+'" stroke-width="1.5" fill="none"/><line x1="7" y1="10" x2="17" y2="10" stroke="'+ic+'" stroke-width="1" opacity=".5"/>',
    'akylux-ss':'<rect x="3" y="4" width="18" height="16" rx="1" fill="'+bg+'"/><rect x="3" y="4" width="18" height="16" rx="1" stroke="'+ic+'" stroke-width="1.5" fill="none"/><line x1="3" y1="8" x2="21" y2="8" stroke="'+ic+'" stroke-width=".5" opacity=".3"/><line x1="3" y1="12" x2="21" y2="12" stroke="'+ic+'" stroke-width=".5" opacity=".3"/><line x1="3" y1="16" x2="21" y2="16" stroke="'+ic+'" stroke-width=".5" opacity=".3"/><line x1="8" y1="9" x2="16" y2="9" stroke="'+ic+'" stroke-width="1.2"/>',
    'akylux-av':'<rect x="3" y="4" width="18" height="16" rx="1" fill="'+bg+'"/><rect x="3" y="4" width="18" height="16" rx="1" stroke="'+ic+'" stroke-width="1.5" fill="none"/><circle cx="5" cy="6" r="1" fill="'+ic+'" opacity=".5"/><circle cx="19" cy="6" r="1" fill="'+ic+'" opacity=".5"/><circle cx="5" cy="18" r="1" fill="'+ic+'" opacity=".5"/><circle cx="19" cy="18" r="1" fill="'+ic+'" opacity=".5"/><line x1="3" y1="8" x2="21" y2="8" stroke="'+ic+'" stroke-width=".5" opacity=".25"/><line x1="3" y1="12" x2="21" y2="12" stroke="'+ic+'" stroke-width=".5" opacity=".25"/><line x1="3" y1="16" x2="21" y2="16" stroke="'+ic+'" stroke-width=".5" opacity=".25"/>',
    'panneau-immo':'<path d="M3 4H21V16H3V4Z" fill="'+bg+'"/><path d="M3 4H21V16H3V4Z" stroke="'+ic+'" stroke-width="1.5" fill="none"/><circle cx="5" cy="6" r="1" fill="'+ic+'" opacity=".5"/><circle cx="19" cy="6" r="1" fill="'+ic+'" opacity=".5"/><circle cx="5" cy="14" r="1" fill="'+ic+'" opacity=".5"/><circle cx="19" cy="14" r="1" fill="'+ic+'" opacity=".5"/><line x1="8" y1="10" x2="16" y2="10" stroke="'+ic+'" stroke-width="1"/><line x1="10" y1="16" x2="10" y2="22" stroke="'+ic+'" stroke-width="1.5"/><line x1="14" y1="16" x2="14" y2="22" stroke="'+ic+'" stroke-width="1.5"/>',
    'panneau-permis':'<rect x="3" y="3" width="18" height="18" rx="1" fill="'+bg+'"/><rect x="3" y="3" width="18" height="18" rx="1" stroke="'+ic+'" stroke-width="1.5" fill="none"/><line x1="6" y1="8" x2="18" y2="8" stroke="'+ic+'" stroke-width="1.2"/><line x1="6" y1="11" x2="16" y2="11" stroke="'+ic+'" stroke-width=".8" opacity=".5"/><line x1="6" y1="14" x2="14" y2="14" stroke="'+ic+'" stroke-width=".7" opacity=".4"/><line x1="6" y1="17" x2="12" y2="17" stroke="'+ic+'" stroke-width=".6" opacity=".3"/>',
    'alu-dibond-ss':'<rect x="3" y="4" width="18" height="16" rx="2" fill="'+bg+'"/><rect x="3" y="4" width="18" height="16" rx="2" stroke="'+ic+'" stroke-width="2" fill="none"/><rect x="6" y="7" width="12" height="5" rx="1" fill="'+ic+'" opacity=".15"/><line x1="7" y1="16" x2="17" y2="16" stroke="'+ic+'" stroke-width="1" opacity=".5"/>',
    'alu-dibond-av':'<rect x="3" y="4" width="18" height="16" rx="2" fill="'+bg+'"/><rect x="3" y="4" width="18" height="16" rx="2" stroke="'+ic+'" stroke-width="2" fill="none"/><circle cx="6" cy="7" r="1.5" fill="'+ic+'" opacity=".4"/><circle cx="18" cy="7" r="1.5" fill="'+ic+'" opacity=".4"/><circle cx="6" cy="17" r="1.5" fill="'+ic+'" opacity=".4"/><circle cx="18" cy="17" r="1.5" fill="'+ic+'" opacity=".4"/><line x1="8" y1="11" x2="16" y2="11" stroke="'+ic+'" stroke-width="1" opacity=".5"/>',
    'plaque-aimant':'<rect x="3" y="5" width="18" height="14" rx="2" fill="'+bg+'"/><rect x="3" y="5" width="18" height="14" rx="2" stroke="'+ic+'" stroke-width="1.5" fill="none"/><path d="M8 10Q8 7 12 7Q16 7 16 10" stroke="'+ic+'" stroke-width="1.5" fill="none"/><line x1="8" y1="10" x2="8" y2="13" stroke="'+ic+'" stroke-width="1.5"/><line x1="16" y1="10" x2="16" y2="13" stroke="'+ic+'" stroke-width="1.5"/>',
    'rollup-ext':'<rect x="7" y="2" width="10" height="17" rx="1" fill="'+bg+'"/><rect x="7" y="2" width="10" height="17" rx="1" stroke="'+ic+'" stroke-width="1.5" fill="none"/><line x1="10" y1="6" x2="14" y2="6" stroke="'+ic+'" stroke-width="1" opacity=".5"/><line x1="10" y1="9" x2="14" y2="9" stroke="'+ic+'" stroke-width=".8" opacity=".4"/><rect x="6" y="19" width="12" height="3" rx="1.5" fill="'+ic+'" opacity=".3"/><rect x="6" y="19" width="12" height="3" rx="1.5" stroke="'+ic+'" stroke-width="1" fill="none"/>',
    'beach-flag':'<line x1="5" y1="2" x2="5" y2="22" stroke="'+ic+'" stroke-width="2"/><path d="M5 3Q18 7 5 13Z" fill="'+ic+'" opacity=".35"/><path d="M5 3Q18 7 5 13" stroke="'+ic+'" stroke-width="1.5" fill="none"/><ellipse cx="5" cy="22" rx="3" ry="1" fill="'+ic+'" opacity=".2"/>',
    'stop-trottoir':'<path d="M6 3H18L19 17H5Z" fill="'+bg+'"/><path d="M6 3H18L19 17H5Z" stroke="'+ic+'" stroke-width="1.5" fill="none"/><line x1="5" y1="17" x2="3" y2="22" stroke="'+ic+'" stroke-width="1.5"/><line x1="19" y1="17" x2="21" y2="22" stroke="'+ic+'" stroke-width="1.5"/><line x1="9" y1="7" x2="15" y2="7" stroke="'+ic+'" stroke-width="1" opacity=".5"/><line x1="9" y1="10" x2="15" y2="10" stroke="'+ic+'" stroke-width=".8" opacity=".4"/>',
    'arche-drapeau':'<path d="M4 22Q4 6 12 4Q20 6 20 22" stroke="'+ic+'" stroke-width="2" fill="none"/><path d="M6 22Q6 8 12 6Q18 8 18 22" stroke="'+ic+'" stroke-width="1" fill="'+bg+'" opacity=".5"/><line x1="4" y1="22" x2="20" y2="22" stroke="'+ic+'" stroke-width="1.5"/>',
    'barnum':'<path d="M2 10L12 4L22 10" fill="'+bg+'"/><path d="M2 10L12 4L22 10" stroke="'+ic+'" stroke-width="1.5" fill="none"/><line x1="2" y1="10" x2="22" y2="10" stroke="'+ic+'" stroke-width="1.5"/><line x1="4" y1="10" x2="4" y2="21" stroke="'+ic+'" stroke-width="1.5"/><line x1="20" y1="10" x2="20" y2="21" stroke="'+ic+'" stroke-width="1.5"/>',
    'paravent':'<line x1="3" y1="6" x2="3" y2="20" stroke="'+ic+'" stroke-width="1.5"/><line x1="9" y1="6" x2="9" y2="20" stroke="'+ic+'" stroke-width="1.5"/><line x1="15" y1="6" x2="15" y2="20" stroke="'+ic+'" stroke-width="1.5"/><line x1="21" y1="6" x2="21" y2="20" stroke="'+ic+'" stroke-width="1.5"/><rect x="3" y="6" width="6" height="14" fill="'+ic+'" opacity=".15"/><rect x="9" y="6" width="6" height="14" fill="'+ic+'" opacity=".1"/><rect x="15" y="6" width="6" height="14" fill="'+ic+'" opacity=".15"/><line x1="3" y1="6" x2="21" y2="6" stroke="'+ic+'" stroke-width="1"/>',
    'transat':'<path d="M5 8L9 20" stroke="'+ic+'" stroke-width="2" stroke-linecap="round"/><path d="M19 8L15 20" stroke="'+ic+'" stroke-width="2" stroke-linecap="round"/><rect x="6" y="4" width="12" height="12" rx="1" fill="'+bg+'" transform="rotate(-15 12 10)"/><rect x="6" y="4" width="12" height="12" rx="1" stroke="'+ic+'" stroke-width="1.5" fill="none" transform="rotate(-15 12 10)"/><line x1="9" y1="20" x2="15" y2="20" stroke="'+ic+'" stroke-width="1.5"/>',
    'chaise-cinema':'<line x1="6" y1="4" x2="6" y2="20" stroke="'+ic+'" stroke-width="1.5"/><line x1="18" y1="4" x2="18" y2="20" stroke="'+ic+'" stroke-width="1.5"/><line x1="6" y1="4" x2="18" y2="4" stroke="'+ic+'" stroke-width="1.5"/><line x1="4" y1="20" x2="8" y2="20" stroke="'+ic+'" stroke-width="1.5"/><line x1="16" y1="20" x2="20" y2="20" stroke="'+ic+'" stroke-width="1.5"/><rect x="6" y="10" width="12" height="6" fill="'+bg+'"/><rect x="6" y="10" width="12" height="6" stroke="'+ic+'" stroke-width="1.5" fill="none"/><line x1="9" y1="12" x2="15" y2="12" stroke="'+ic+'" stroke-width=".8" opacity=".4"/>',
    'parasol':'<path d="M3 10Q3 4 12 3Q21 4 21 10Z" fill="'+bg+'"/><path d="M3 10Q3 4 12 3Q21 4 21 10" stroke="'+ic+'" stroke-width="1.5" fill="none"/><line x1="3" y1="10" x2="21" y2="10" stroke="'+ic+'" stroke-width="1.5"/><line x1="12" y1="3" x2="12" y2="22" stroke="'+ic+'" stroke-width="2"/><line x1="8" y1="22" x2="16" y2="22" stroke="'+ic+'" stroke-width="1.5"/>',
    'colonne-gonf':'<ellipse cx="12" cy="5" rx="5" ry="2" fill="'+bg+'"/><ellipse cx="12" cy="5" rx="5" ry="2" stroke="'+ic+'" stroke-width="1.5" fill="none"/><path d="M7 5V19" stroke="'+ic+'" stroke-width="1.5"/><path d="M17 5V19" stroke="'+ic+'" stroke-width="1.5"/><ellipse cx="12" cy="19" rx="5" ry="2" fill="'+bg+'"/><ellipse cx="12" cy="19" rx="5" ry="2" stroke="'+ic+'" stroke-width="1.5" fill="none"/>',
    // ── COM\'PERSONNALISÉ ──
    'tshirt':'<path d="M3 8L7 5L9 7.5Q12 9.5 15 7.5L17 5L21 8L18 12L16 10V21H8V10L6 12Z" fill="'+bg+'"/><path d="M3 8L7 5L9 7.5Q12 9.5 15 7.5L17 5L21 8L18 12L16 10V21H8V10L6 12Z" stroke="'+ic+'" stroke-width="1.5" fill="none"/>',
    'tshirt-broderie':'<path d="M3 8L7 5L9 7.5Q12 9.5 15 7.5L17 5L21 8L18 12L16 10V21H8V10L6 12Z" fill="'+bg+'"/><path d="M3 8L7 5L9 7.5Q12 9.5 15 7.5L17 5L21 8L18 12L16 10V21H8V10L6 12Z" stroke="'+ic+'" stroke-width="1.5" fill="none"/><circle cx="12" cy="13" r="2.5" fill="'+ic+'" opacity=".25"/><path d="M10.5 13L11.5 14L13.5 12" stroke="'+ic+'" stroke-width=".8" fill="none"/>',
    'polo':'<path d="M3 8L7 5L9 7.5Q12 9.5 15 7.5L17 5L21 8L18 12L16 10V21H8V10L6 12Z" fill="'+bg+'"/><path d="M3 8L7 5L9 7.5Q12 9.5 15 7.5L17 5L21 8L18 12L16 10V21H8V10L6 12Z" stroke="'+ic+'" stroke-width="1.5" fill="none"/><path d="M10 5.5V9" stroke="'+ic+'" stroke-width="1.2"/><path d="M14 5.5V9" stroke="'+ic+'" stroke-width="1.2"/><circle cx="12" cy="7" r=".8" fill="'+ic+'"/><circle cx="12" cy="9.5" r=".8" fill="'+ic+'"/>',
    'veste':'<path d="M3 7L7 4L9 7Q12 9 15 7L17 4L21 7L19 11L17 9V21H13V14H11V21H7V9L5 11Z" fill="'+bg+'"/><path d="M3 7L7 4L9 7Q12 9 15 7L17 4L21 7L19 11L17 9V21H13V14H11V21H7V9L5 11Z" stroke="'+ic+'" stroke-width="1.5" fill="none"/><line x1="12" y1="7" x2="12" y2="14" stroke="'+ic+'" stroke-width="1" stroke-dasharray="1.5 1"/>',
    'chemise':'<path d="M3 7L7 4L9 7Q12 9 15 7L17 4L21 7L19 11L17 9V21H7V9L5 11Z" fill="'+bg+'"/><path d="M3 7L7 4L9 7Q12 9 15 7L17 4L21 7L19 11L17 9V21H7V9L5 11Z" stroke="'+ic+'" stroke-width="1.5" fill="none"/><path d="M10 4L12 7L14 4" stroke="'+ic+'" stroke-width="1.2" fill="none"/><circle cx="12" cy="12" r="2" fill="'+ic+'" opacity=".2"/>',
    'casquette':'<path d="M3 14Q3 9 12 8Q21 9 21 14" fill="'+bg+'"/><path d="M3 14Q3 9 12 8Q21 9 21 14" stroke="'+ic+'" stroke-width="1.5" fill="none"/><line x1="3" y1="14" x2="21" y2="14" stroke="'+ic+'" stroke-width="1.5"/><path d="M21 14Q23 15 22 17" stroke="'+ic+'" stroke-width="1.5" fill="none"/><circle cx="12" cy="8" r="1" fill="'+ic+'"/>',
    'casquette-broderie':'<path d="M3 14Q3 9 12 8Q21 9 21 14" fill="'+bg+'"/><path d="M3 14Q3 9 12 8Q21 9 21 14" stroke="'+ic+'" stroke-width="1.5" fill="none"/><line x1="3" y1="14" x2="21" y2="14" stroke="'+ic+'" stroke-width="1.5"/><path d="M21 14Q23 15 22 17" stroke="'+ic+'" stroke-width="1.5" fill="none"/><circle cx="12" cy="11" r="2" fill="'+ic+'" opacity=".3"/><path d="M10.5 11L11.5 12L13.5 10" stroke="'+ic+'" stroke-width=".8" fill="none"/>',
    'totebag':'<path d="M5 9H19V21H5Z" fill="'+bg+'"/><path d="M5 9H19V21H5Z" stroke="'+ic+'" stroke-width="1.5" fill="none"/><path d="M8 9Q8 4 12 4Q16 4 16 9" stroke="'+ic+'" stroke-width="1.5" fill="none"/><rect x="9" y="13" width="6" height="4" rx="1" fill="'+ic+'" opacity=".15"/>',
    'gobelet':'<path d="M6 3H18L16 21H8Z" fill="'+bg+'"/><path d="M6 3H18L16 21H8Z" stroke="'+ic+'" stroke-width="1.5" fill="none"/><ellipse cx="12" cy="3" rx="6" ry="1.5" fill="'+bg+'"/><ellipse cx="12" cy="3" rx="6" ry="1.5" stroke="'+ic+'" stroke-width="1.5" fill="none"/><ellipse cx="12" cy="11" rx="3.5" ry="1.5" stroke="'+ic+'" stroke-width=".8" fill="none" opacity=".3"/>',
    'mug':'<rect x="4" y="7" width="12" height="13" rx="2" fill="'+bg+'"/><rect x="4" y="7" width="12" height="13" rx="2" stroke="'+ic+'" stroke-width="1.5" fill="none"/><path d="M16 10H18A2 2 0 0120 12V14A2 2 0 0118 16H16" stroke="'+ic+'" stroke-width="1.5" fill="none"/>',
    // ── COM\'SERVICES ──
    'impression-doc':'<rect x="5" y="2" width="14" height="18" rx="1" fill="'+bg+'"/><rect x="5" y="2" width="14" height="18" rx="1" stroke="'+ic+'" stroke-width="1.5" fill="none"/><line x1="8" y1="6" x2="16" y2="6" stroke="'+ic+'" stroke-width="1"/><line x1="8" y1="9" x2="16" y2="9" stroke="'+ic+'" stroke-width=".8" opacity=".5"/><line x1="8" y1="12" x2="14" y2="12" stroke="'+ic+'" stroke-width=".8" opacity=".4"/><line x1="8" y1="15" x2="12" y2="15" stroke="'+ic+'" stroke-width=".6" opacity=".3"/><path d="M3 20H21V22H3Z" fill="'+ic+'" opacity=".2"/><path d="M3 20H21V22H3Z" stroke="'+ic+'" stroke-width="1" fill="none"/>',
    'plastif-a4':'<rect x="4" y="2" width="16" height="20" rx="1" fill="'+bg+'"/><rect x="4" y="2" width="16" height="20" rx="1" stroke="'+ic+'" stroke-width="1.5" fill="none"/><rect x="6" y="4" width="12" height="16" rx=".5" fill="'+ic+'" opacity=".12"/><line x1="8" y1="9" x2="16" y2="9" stroke="'+ic+'" stroke-width=".8" opacity=".5"/><line x1="8" y1="12" x2="14" y2="12" stroke="'+ic+'" stroke-width=".7" opacity=".4"/><path d="M17 2L20 2L20 6" stroke="'+ic+'" stroke-width="1.2" fill="none" opacity=".6"/>',
    'photo-10x15-bri':'<rect x="4" y="3" width="16" height="18" rx="1.5" fill="'+bg+'"/><rect x="4" y="3" width="16" height="18" rx="1.5" stroke="'+ic+'" stroke-width="1.5" fill="none"/><rect x="6" y="5" width="12" height="9" rx="1" fill="'+ic+'" opacity=".15"/><circle cx="15" cy="8" r="1.5" fill="'+ic+'" opacity=".3"/><path d="M6 12L9 9L12 11L15 8L18 12V14H6Z" fill="'+ic+'" opacity=".25"/>',
    'photo-13x18-bri':'<rect x="3" y="2" width="18" height="20" rx="1.5" fill="'+bg+'"/><rect x="3" y="2" width="18" height="20" rx="1.5" stroke="'+ic+'" stroke-width="1.5" fill="none"/><rect x="5" y="4" width="14" height="10" rx="1" fill="'+ic+'" opacity=".15"/><circle cx="16" cy="7" r="1.5" fill="'+ic+'" opacity=".3"/><path d="M5 12L8 9L11 11L14 8L19 12V14H5Z" fill="'+ic+'" opacity=".25"/><line x1="7" y1="18" x2="17" y2="18" stroke="'+ic+'" stroke-width=".8" opacity=".3"/>',
    'photo-10x15-sat':'<rect x="4" y="3" width="16" height="18" rx="1.5" fill="'+bg+'"/><rect x="4" y="3" width="16" height="18" rx="1.5" stroke="'+ic+'" stroke-width="1.5" fill="none"/><rect x="6" y="5" width="12" height="9" rx="1" fill="'+ic+'" opacity=".1"/><circle cx="15" cy="8" r="1.5" fill="'+ic+'" opacity=".25"/><path d="M6 12L9 9L12 11L15 8L18 12V14H6Z" fill="'+ic+'" opacity=".2"/><line x1="6" y1="17" x2="10" y2="17" stroke="'+ic+'" stroke-width=".7" opacity=".3"/>',
    'photo-a4-sat':'<rect x="4" y="2" width="16" height="20" rx="1.5" fill="'+bg+'"/><rect x="4" y="2" width="16" height="20" rx="1.5" stroke="'+ic+'" stroke-width="1.5" fill="none"/><rect x="6" y="4" width="12" height="10" rx="1" fill="'+ic+'" opacity=".1"/><circle cx="15" cy="7" r="2" fill="'+ic+'" opacity=".25"/><path d="M6 12L9 9L12 11L14 8L18 12V14H6Z" fill="'+ic+'" opacity=".2"/><line x1="7" y1="18" x2="13" y2="18" stroke="'+ic+'" stroke-width=".8" opacity=".3"/>',
    'photo-a4-bri':'<rect x="4" y="2" width="16" height="20" rx="1.5" fill="'+bg+'"/><rect x="4" y="2" width="16" height="20" rx="1.5" stroke="'+ic+'" stroke-width="1.5" fill="none"/><rect x="6" y="4" width="12" height="10" rx="1" fill="'+ic+'" opacity=".15"/><circle cx="15" cy="7" r="2" fill="'+ic+'" opacity=".3"/><path d="M6 12L9 9L12 11L14 8L18 12V14H6Z" fill="'+ic+'" opacity=".25"/>',
    // ── COM'ÉVÉNEMENTIEL ──
    'faire-part-a5':'<rect x="3" y="4" width="18" height="16" rx="2" fill="'+bg+'"/><rect x="3" y="4" width="18" height="16" rx="2" stroke="'+ic+'" stroke-width="1.5" fill="none"/><path d="M6 7Q12 13 18 7" stroke="'+ic+'" stroke-width="1.5" fill="none"/><circle cx="12" cy="14" r="3" fill="'+ic+'" opacity=".2"/>',
    'faire-part-pli':'<rect x="2" y="4" width="10" height="16" rx="1.5" fill="'+bg+'"/><rect x="2" y="4" width="10" height="16" rx="1.5" stroke="'+ic+'" stroke-width="1.3" fill="none"/><rect x="12" y="4" width="10" height="16" rx="1.5" fill="'+bg+'"/><rect x="12" y="4" width="10" height="16" rx="1.5" stroke="'+ic+'" stroke-width="1.5" fill="none"/><line x1="12" y1="4" x2="12" y2="20" stroke="'+ic+'" stroke-width="1" stroke-dasharray="2 1"/><circle cx="17" cy="12" r="2" fill="'+ic+'" opacity=".2"/>',
    'faire-part-a6-evt':'<rect x="4" y="5" width="16" height="14" rx="2" fill="'+bg+'"/><rect x="4" y="5" width="16" height="14" rx="2" stroke="'+ic+'" stroke-width="1.5" fill="none"/><path d="M7 8Q12 13 17 8" stroke="'+ic+'" stroke-width="1.5" fill="none"/><circle cx="12" cy="14" r="2.5" fill="'+ic+'" opacity=".2"/>',
    'magnet-save':'<rect x="3" y="4" width="18" height="16" rx="2" fill="'+bg+'"/><rect x="3" y="4" width="18" height="16" rx="2" stroke="'+ic+'" stroke-width="1.5" fill="none"/><path d="M8 10Q8 7 12 7Q16 7 16 10" stroke="'+ic+'" stroke-width="1.5" fill="none"/><line x1="8" y1="10" x2="8" y2="14" stroke="'+ic+'" stroke-width="1.5"/><line x1="16" y1="10" x2="16" y2="14" stroke="'+ic+'" stroke-width="1.5"/><line x1="7" y1="17" x2="17" y2="17" stroke="'+ic+'" stroke-width=".8" opacity=".4"/>',
    'carte-invit':'<rect x="3" y="5" width="18" height="14" rx="2" fill="'+bg+'"/><rect x="3" y="5" width="18" height="14" rx="2" stroke="'+ic+'" stroke-width="1.5" fill="none"/><path d="M3 7L12 14L21 7" stroke="'+ic+'" stroke-width="1.2" fill="none"/><rect x="14" y="2" width="8" height="6" rx="1" fill="'+bg+'"/><rect x="14" y="2" width="8" height="6" rx="1" stroke="'+ic+'" stroke-width="1" fill="none"/>',
    'menu-evt-carte':'<rect x="4" y="2" width="16" height="20" rx="2" fill="'+bg+'"/><rect x="4" y="2" width="16" height="20" rx="2" stroke="'+ic+'" stroke-width="1.5" fill="none"/><line x1="8" y1="6" x2="16" y2="6" stroke="'+ic+'" stroke-width="1.5"/><line x1="7" y1="10" x2="12" y2="10" stroke="'+ic+'" stroke-width=".8" opacity=".5"/><line x1="14" y1="10" x2="17" y2="10" stroke="'+ic+'" stroke-width=".8" opacity=".5"/><line x1="7" y1="13" x2="11" y2="13" stroke="'+ic+'" stroke-width=".8" opacity=".5"/><line x1="14" y1="13" x2="17" y2="13" stroke="'+ic+'" stroke-width=".8" opacity=".5"/><line x1="7" y1="16" x2="13" y2="16" stroke="'+ic+'" stroke-width=".8" opacity=".5"/>',
    'menu-evt-chev':'<path d="M5 20L12 4L19 20" stroke="'+ic+'" stroke-width="1.5" fill="none"/><rect x="6" y="6" width="12" height="10" rx="1" fill="'+bg+'"/><rect x="6" y="6" width="12" height="10" rx="1" stroke="'+ic+'" stroke-width="1.5" fill="none"/><line x1="9" y1="10" x2="15" y2="10" stroke="'+ic+'" stroke-width="1" opacity=".5"/><line x1="9" y1="13" x2="13" y2="13" stroke="'+ic+'" stroke-width=".8" opacity=".4"/>',
    'plan-table':'<rect x="2" y="3" width="20" height="18" rx="2" fill="'+bg+'"/><rect x="2" y="3" width="20" height="18" rx="2" stroke="'+ic+'" stroke-width="1.5" fill="none"/><line x1="2" y1="8" x2="22" y2="8" stroke="'+ic+'" stroke-width="1"/><line x1="8" y1="8" x2="8" y2="21" stroke="'+ic+'" stroke-width=".8" opacity=".4"/><line x1="15" y1="8" x2="15" y2="21" stroke="'+ic+'" stroke-width=".8" opacity=".4"/><line x1="5" y1="5.5" x2="19" y2="5.5" stroke="'+ic+'" stroke-width="1.2"/>',
    'gobelet-evt':'<path d="M6 3H18L16 21H8Z" fill="'+bg+'"/><path d="M6 3H18L16 21H8Z" stroke="'+ic+'" stroke-width="1.5" fill="none"/><ellipse cx="12" cy="3" rx="6" ry="1.5" fill="'+bg+'"/><ellipse cx="12" cy="3" rx="6" ry="1.5" stroke="'+ic+'" stroke-width="1.5" fill="none"/><ellipse cx="12" cy="11" rx="3.5" ry="1.5" stroke="'+ic+'" stroke-width=".8" fill="none" opacity=".3"/>',
    'panneau-bienv':'<rect x="3" y="4" width="18" height="14" rx="2" fill="'+bg+'"/><rect x="3" y="4" width="18" height="14" rx="2" stroke="'+ic+'" stroke-width="1.5" fill="none"/><line x1="7" y1="8" x2="17" y2="8" stroke="'+ic+'" stroke-width="1.2"/><line x1="8" y1="11" x2="16" y2="11" stroke="'+ic+'" stroke-width=".8" opacity=".5"/><line x1="9" y1="14" x2="15" y2="14" stroke="'+ic+'" stroke-width=".6" opacity=".4"/><line x1="10" y1="18" x2="10" y2="22" stroke="'+ic+'" stroke-width="1.5"/><line x1="14" y1="18" x2="14" y2="22" stroke="'+ic+'" stroke-width="1.5"/>',
    'beach-flag-evt':'<line x1="5" y1="2" x2="5" y2="22" stroke="'+ic+'" stroke-width="2"/><path d="M5 3Q18 7 5 13Z" fill="'+ic+'" opacity=".35"/><path d="M5 3Q18 7 5 13" stroke="'+ic+'" stroke-width="1.5" fill="none"/><ellipse cx="5" cy="22" rx="3" ry="1" fill="'+ic+'" opacity=".2"/>',
    'arche-gonf':'<path d="M4 22Q4 6 12 4Q20 6 20 22" stroke="'+ic+'" stroke-width="2" fill="none"/><path d="M6 22Q6 8 12 6Q18 8 18 22" stroke="'+ic+'" stroke-width="1" fill="'+bg+'" opacity=".5"/><line x1="4" y1="22" x2="20" y2="22" stroke="'+ic+'" stroke-width="1.5"/>',
    'transat-evt':'<path d="M5 8L9 20" stroke="'+ic+'" stroke-width="2" stroke-linecap="round"/><path d="M19 8L15 20" stroke="'+ic+'" stroke-width="2" stroke-linecap="round"/><rect x="6" y="4" width="12" height="12" rx="1" fill="'+bg+'" transform="rotate(-15 12 10)"/><rect x="6" y="4" width="12" height="12" rx="1" stroke="'+ic+'" stroke-width="1.5" fill="none" transform="rotate(-15 12 10)"/><line x1="9" y1="20" x2="15" y2="20" stroke="'+ic+'" stroke-width="1.5"/>',
    'rollup-evt':'<rect x="7" y="2" width="10" height="17" rx="1" fill="'+bg+'"/><rect x="7" y="2" width="10" height="17" rx="1" stroke="'+ic+'" stroke-width="1.5" fill="none"/><line x1="10" y1="6" x2="14" y2="6" stroke="'+ic+'" stroke-width="1" opacity=".5"/><line x1="10" y1="9" x2="14" y2="9" stroke="'+ic+'" stroke-width=".8" opacity=".4"/><rect x="6" y="19" width="12" height="3" rx="1.5" fill="'+ic+'" opacity=".3"/><rect x="6" y="19" width="12" height="3" rx="1.5" stroke="'+ic+'" stroke-width="1" fill="none"/>',
    'carte-remerci':'<rect x="4" y="5" width="16" height="14" rx="2" fill="'+bg+'"/><rect x="4" y="5" width="16" height="14" rx="2" stroke="'+ic+'" stroke-width="1.5" fill="none"/><path d="M7 8Q12 13 17 8" stroke="'+ic+'" stroke-width="1.5" fill="none"/><line x1="8" y1="15" x2="16" y2="15" stroke="'+ic+'" stroke-width=".8" opacity=".4"/>',
    'totebag-evt':'<path d="M5 9H19V21H5Z" fill="'+bg+'"/><path d="M5 9H19V21H5Z" stroke="'+ic+'" stroke-width="1.5" fill="none"/><path d="M8 9Q8 4 12 4Q16 4 16 9" stroke="'+ic+'" stroke-width="1.5" fill="none"/><rect x="9" y="13" width="6" height="4" rx="1" fill="'+ic+'" opacity=".15"/>',
    // ── DÉFAUT ──
    '_default':'<rect x="3" y="3" width="18" height="18" rx="3" fill="'+bg+'"/><rect x="3" y="3" width="18" height="18" rx="3" stroke="'+ic+'" stroke-width="1.5" fill="none"/><line x1="8" y1="8" x2="16" y2="8" stroke="'+ic+'" stroke-width="1.2"/><line x1="8" y1="12" x2="16" y2="12" stroke="'+ic+'" stroke-width="1.2"/><line x1="8" y1="16" x2="13" y2="16" stroke="'+ic+'" stroke-width="1.2"/>'
  };
  var shape = shapes[id] || shapes['_default'];
  return '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' + shape + '</svg>';
}

function renderProduits(cat){
  var list=document.getElementById('plist-modal');
  var prods=CAT[cat]||[];
  if(!prods.length){list.innerHTML='<p style="grid-column:1/-1;text-align:center;padding:30px;color:var(--grt);">Catégorie vide.</p>';return;}
  list.innerHTML=prods.map(function(p){
    var ico=getProdIcon(p.id,cat);
    var px=p.prix||'Sur devis';
    var pxDisplay=px.replace('des ','dès ').replace('EUR','€').replace('/m2','/m²').replace('/u','/u.');
    return '<div class="pcard-modal" data-pid="'+p.id+'" data-cat="'+cat+'">'
      +'<div class="pico-m">'+ico+'</div>'
      +'<div class="pnom-m">'+p.nom+'</div>'
      +'<span class="pprix-m">'+pxDisplay+'</span>'
      +'</div>';
  }).join('');
}


function escHtml(value){
  return String(value==null?'':value).replace(/[&<>\"']/g,function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c];
  });
}

function catalogueFlat(){
  var out=[];
  Object.keys(CAT).forEach(function(cat){
    (CAT[cat]||[]).forEach(function(prod){
      out.push({cat:cat,prod:prod});
    });
  });
  return out;
}

function findCatalogueProduct(pid){
  var found=null;
  catalogueFlat().some(function(entry){
    if(entry.prod && entry.prod.id===pid){ found=entry; return true; }
    return false;
  });
  return found;
}

function defaultSeasonalProductIds(){
  return ['faire-part-a5','plan-table','panneau-bienv','menu-evt-carte','carte-remerci','gobelet-evt'];
}

async function chargerSiteConfig(){
  var fallbackIds = defaultSeasonalProductIds();
  try {
    var res = await fetch(API_BASE + '/api/site-config');
    var json = await res.json();
    var config = (json && json.config) || {};

    var heroBadge = document.getElementById('hero-badge-text');
    if (heroBadge && config.heroBadge) heroBadge.textContent = config.heroBadge;

    var heroLine1 = document.getElementById('hero-title-line1');
    if (heroLine1 && config.heroLine1) heroLine1.textContent = config.heroLine1;

    var heroHighlight = document.getElementById('hero-title-highlight');
    if (heroHighlight && config.heroHighlight) heroHighlight.textContent = config.heroHighlight;

    var heroLine2 = document.getElementById('hero-title-line2');
    if (heroLine2 && config.heroLine2) heroLine2.textContent = config.heroLine2;

    var heroSlogan = document.getElementById('hero-slogan-text');
    if (heroSlogan && config.heroSlogan) heroSlogan.textContent = config.heroSlogan;

    var heroText = document.getElementById('hero-body-text');
    if (heroText && config.heroText) heroText.textContent = config.heroText;

    var productsTitle = document.getElementById('products-title-main');
    if (productsTitle && config.productsTitle) productsTitle.textContent = config.productsTitle;

    var productsAccent = document.getElementById('products-title-accent');
    if (productsAccent && config.productsAccent) productsAccent.textContent = config.productsAccent;

    var productsSubtitle = document.getElementById('products-subtitle');
    if (productsSubtitle && config.productsSubtitle) productsSubtitle.textContent = config.productsSubtitle;

    var heroInner = document.querySelector('.hero-inner');
    var heroImageWrap = document.getElementById('hero-image-wrap');
    var heroImage = document.getElementById('hero-image');
    if (heroImageWrap && heroImage) {
      if (config.heroImage) {
        heroImage.src = config.heroImage;
        heroImageWrap.classList.add('show');
        if (heroInner) heroInner.classList.remove('no-media');
      } else {
        heroImage.removeAttribute('src');
        heroImageWrap.classList.remove('show');
        if (heroInner) heroInner.classList.add('no-media');
      }
    }

    renderPublicProductsGrid(config.seasonalProductIds || fallbackIds);
  } catch (err) {
    console.warn('chargerSiteConfig:', err && err.message ? err.message : err);
    var heroInner = document.querySelector('.hero-inner');
    if (heroInner) heroInner.classList.add('no-media');
    renderPublicProductsGrid(fallbackIds);
  }
}

function renderPublicProductsGrid(ids){
  var grid=document.getElementById('products-grid');
  if(!grid) return;
  var chosen=(ids||[]).map(findCatalogueProduct).filter(Boolean);
  if(!chosen.length){
    chosen=defaultSeasonalProductIds().map(findCatalogueProduct).filter(Boolean);
  }
  grid.innerHTML=chosen.map(function(entry){
    var p=entry.prod,cat=entry.cat;
    var ico=getProdIcon(p.id,cat);
    var px=(p.prix||'Sur devis').replace('des ','dès ').replace('EUR','€').replace('/m2','/m²').replace('/u','/u.');
    return '<button type="button" class="pcard" data-cat="'+escHtml(cat)+'" data-id="'+escHtml(p.id)+'">'
      +'<div class="pico">'+ico+'</div>'
      +'<div class="pnom">'+escHtml(p.nom)+'</div>'
      +'<div class="pdesc">'+escHtml(p.desc||'Produit saisonnier à personnaliser selon votre événement.')+'</div>'
      +'<span class="pprix">'+escHtml(px)+'</span>'
      +'</button>';
  }).join('');
}

function renderAvisPublic(list){
  var grid=document.getElementById('avis-grid');
  if(!grid) return;
  var avis=Array.isArray(list)?list:[];
  if(!avis.length){
    grid.innerHTML='<div style="grid-column:1/-1;background:#fff;border:1px solid #f0ebe4;border-radius:18px;padding:20px;color:#888;text-align:center;">Aucun avis publié pour le moment.</div>';
    return;
  }
  grid.innerHTML=avis.slice(0,6).map(function(a){
    var stars='★★★★★'.slice(0,Math.max(1,Math.min(5,parseInt(a.note,10)||5)));
    var meta=[a.prenom||'Client',a.ville||'',a.produit||''].filter(Boolean).join(' — ');
    return '<div style="background:#fff;border-radius:18px;padding:24px;border:1px solid #f5e7db;box-shadow:0 12px 30px rgba(244,123,32,.08);">'
      +'<div style="font-size:1.2rem;color:var(--or);letter-spacing:2px;margin-bottom:10px;">'+stars+'</div>'
      +'<div style="font-size:.96rem;line-height:1.7;color:#444;margin-bottom:16px;">« '+escHtml(a.texte||'')+' »</div>'
      +'<div style="font-weight:800;color:#222;">'+escHtml(meta||'Client COM Impression')+'</div>'
      +'</div>';
  }).join('');
}

function chargerAvisPublic(){
  var grid=document.getElementById('avis-grid');
  if(!grid) return Promise.resolve();
  return fetch(API_BASE + '/api/avis')
    .then(function(res){
      return res.json().catch(function(){ return {}; }).then(function(json){
        if(!res.ok) throw new Error((json && json.error) || ('HTTP ' + res.status));
        return json;
      });
    })
    .then(function(json){
      renderAvisPublic((json && json.avis) || []);
    })
    .catch(function(err){
      console.warn('chargerAvisPublic:', err && err.message ? err.message : err);
      renderAvisPublic([]);
    });
}

function totalPanier(){

  var s=0,sd=false;
  panier.forEach(function(i){
    if(i.prix==='Sur devis'||i.prix.indexOf('m²')>-1) sd=true;
    else{var n=parseFloat(i.prix.replace(' €','').replace(',','.')); if(!isNaN(n)) s+=n;}
  });
  return sd?'Sur devis (ou mixte)':s.toFixed(2).replace('.',',')+' €';
}

function renderStripeOrderSummary(items,totalLabel){
  var wrap=document.getElementById('stripe-order-summary');
  if(!wrap) return;

  var lignes=Array.isArray(items)?items:[];
  if(!lignes.length){
    wrap.innerHTML='<div style="padding:14px 16px;border:1px solid #f0ebe4;border-radius:14px;background:#fff;color:#666;font-size:.9rem;">Aucun article à afficher.</div>';
    return;
  }

  var rows=lignes.map(function(item){
    var nom=escHtml(item && item.nom ? item.nom : 'Produit');
    var qte=escHtml(item && item.qte ? item.qte : '—');
    var prix=escHtml(item && item.prix ? item.prix : '—');
    var opts=item && item.sels ? Object.entries(item.sels).map(function(entry){
      return escHtml(entry[0])+': '+escHtml(entry[1]);
    }).join(' · ') : '';
    return '<tr>'
      +'<td style="padding:10px 0;border-bottom:1px solid #f5eee7;vertical-align:top;">'
      +'<div style="font-weight:800;color:#222;">'+nom+'</div>'
      +(opts?'<div style="font-size:.82rem;color:#777;margin-top:4px;line-height:1.45;">'+opts+'</div>':'')
      +'</td>'
      +'<td style="padding:10px 0;border-bottom:1px solid #f5eee7;text-align:center;white-space:nowrap;color:#444;">'+qte+'</td>'
      +'<td style="padding:10px 0;border-bottom:1px solid #f5eee7;text-align:right;white-space:nowrap;font-weight:800;color:#f47b20;">'+prix+'</td>'
      +'</tr>';
  }).join('');

  wrap.innerHTML=''
    +'<div style="border:1px solid #f0ebe4;border-radius:18px;background:#fff;overflow:hidden;">'
    +'<div style="padding:14px 16px;background:#fff5ec;border-bottom:1px solid #f5e7db;font-family:\'Baloo 2\',cursive;font-weight:800;font-size:1.02rem;color:#1f1f1f;">Résumé de votre commande</div>'
    +'<div style="padding:0 16px 14px;">'
    +'<table style="width:100%;border-collapse:collapse;font-size:.9rem;">'
    +'<thead><tr>'
    +'<th style="text-align:left;padding:12px 0 8px;font-size:.76rem;letter-spacing:.04em;text-transform:uppercase;color:#888;">Article</th>'
    +'<th style="text-align:center;padding:12px 0 8px;font-size:.76rem;letter-spacing:.04em;text-transform:uppercase;color:#888;">Qté</th>'
    +'<th style="text-align:right;padding:12px 0 8px;font-size:.76rem;letter-spacing:.04em;text-transform:uppercase;color:#888;">Montant</th>'
    +'</tr></thead>'
    +'<tbody>'+rows+'</tbody>'
    +'<tfoot><tr>'
    +'<td colspan="2" style="padding-top:14px;font-weight:800;color:#222;">Total TTC</td>'
    +'<td style="padding-top:14px;text-align:right;font-weight:900;color:#f47b20;font-size:1rem;white-space:nowrap;">'+escHtml(totalLabel||'—')+'</td>'
    +'</tr></tfoot>'
    +'</table>'
    +'</div>'
    +'</div>';
}

function lignesHTML(){
  if(!panier.length) return '<p style="color:var(--grt);font-size:.83rem;">Votre panier est vide.</p>';
  return panier.map(function(i){
    var opts=Object.entries(i.sels).map(function(e){return e[0]+': '+e[1];}).join(' · ');
    return '<div class="pitem-r"><div class="pi-info">'
      +'<div class="pi-nom">'+i.nom+'</div>'
      +'<div class="pi-opts">'+opts+' — '+i.qte+'</div>'
      +(i.fichier?'<div class="pi-file">📎 '+i.fichier+'</div>':'')
      +'</div><span style="display:flex;align-items:center;gap:6px;">'
      +'<span style="font-weight:700;white-space:nowrap;">'+i.prix+'</span>'
      +'<button class="pi-del" data-del="'+i.id+'" title="Supprimer" style="background:none;border:none;cursor:pointer;color:#e53e3e;padding:4px;border-radius:6px;">'
      +'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>'
      +'</button></span></div>';
  }).join('');
}

function majBadge(){
  var n=panier?panier.length:0;
  var b=document.getElementById('badge'); if(b) b.textContent=n;
  var cn=document.getElementById('cart-fl-n'); if(cn) cn.textContent=n;
  var cf=document.getElementById('cart-fl'); if(cf) cf.style.display='flex';
}
function majRecap(){
  var el=document.getElementById('precap-items'); if(el) el.innerHTML=lignesHTML();
  var tel=document.getElementById('precap-total'); if(tel) tel.querySelector('span:last-child').textContent=totalPanier();
  majActionCommande();
}
function majPanierFl(){
  var el=document.getElementById('panier-fl-items'); if(el) el.innerHTML=lignesHTML();
  var tel=document.getElementById('panier-fl-total'); if(tel) tel.querySelector('span:last-child').textContent=totalPanier();
}

// ===== POPUP PRODUIT =====
var mpCat=null,mpPid=null,mpFichiers=[];

function majPrixPopup(){
  var cat=mpCat,pid=mpPid; if(!cat||!pid) return;
  var prod=(CAT[cat]||[]).find(function(p){return p.id===pid;}); if(!prod) return;
  var sels={};
  Object.keys(prod.opts||{}).forEach(function(k){
    var sel=document.getElementById('mpo_'+k.replace(/[^a-zA-Z0-9]/g,'_'));
    if(sel) sels[k]=sel.value;
  });
  var qte='';
  if(prod.unite==='page'){
    var ppQ=document.getElementById('pp-qty'),ppE=document.getElementById('pp-exemplaires');
    qte=String((parseInt((ppQ?ppQ.value:'1'))||1)*(parseInt((ppE?ppE.value:'1'))||1));
  } else {
    var qBtn=document.getElementById('mp-qbtns').querySelector('.qbtn.on');
    qte=qBtn?qBtn.dataset.q:'';
    if(qte==='autre') qte=document.getElementById('mp-qinput').value||'';
  }
  var larg=document.getElementById('mp-larg').value||'';
  var haut=document.getElementById('mp-haut').value||'';
  document.getElementById('mp-prix').textContent=calcPrix(prod,sels,qte,larg,haut);
}

function ajouterDepuisPopup(){
  var cat=mpCat,pid=mpPid;
  var prod=(CAT[cat]||[]).find(function(p){return p.id===pid;}); if(!prod) return;
  var sels={};
  Object.keys(prod.opts||{}).forEach(function(k){
    var sel=document.getElementById('mpo_'+k.replace(/[^a-zA-Z0-9]/g,'_'));
    if(sel) sels[k]=sel.value;
  });
  var qte='';
  if(prod.unite==='page'){
    var ppQ=document.getElementById('pp-qty'); var nbP=ppQ?(parseInt(ppQ.value)||1):1;
    var ppE=document.getElementById('pp-exemplaires'); var nbE=ppE?(parseInt(ppE.value)||1):1;
    qte=String(nbP*nbE);
  } else {
    var qBtn=document.getElementById('mp-qbtns').querySelector('.qbtn.on');
    qte=qBtn?qBtn.dataset.q:'';
    if(qte==='autre') qte=document.getElementById('mp-qinput').value||'';
    if(!qte&&prod.Q){toast('⚠️ Sélectionnez une quantité');return;}
  }
  var larg=document.getElementById('mp-larg').value||'';
  var haut=document.getElementById('mp-haut').value||'';
  var prix=calcPrix(prod,sels,qte,larg,haut);
  var id=++uid;
  panier.push({id:id,cat:cat,pid:pid,nom:prod.nom,sels:sels,qte:qte?qte+' ex.':'Sur devis',prix:prix,
    fichier:mpFichiers.length>0?mpFichiers.map(function(f){return f.name;}).join(', '):null,
    fichierObjs:mpFichiers.slice()});
  majBadge();majRecap();majPanierFl();
  document.getElementById('m-produit').classList.remove('open');
  toast('✅ "'+prod.nom+'" ajouté au panier !');
}

function ouvrirPopupProduit(cat,pid){
  var prods=CAT[cat]||[];
  var prod=prods.find(function(p){return p.id===pid;}); if(!prod) return;
  mpCat=cat; mpPid=pid; mpFichiers=[];
  document.getElementById('mp-titre').textContent=prod.nom;
  var pidH=document.getElementById('mp-pid'); if(pidH) pidH.value=prod.id;
  var qsec=document.getElementById('mp-qsec'),qbtns=document.getElementById('mp-qbtns'),qinp=document.getElementById('mp-qinput');
  if(prod.Q&&prod.unite==='page'){
    qsec.style.display='none'; qbtns.innerHTML=''; qinp.style.display='none'; qinp.value='';
    var pb=document.getElementById('mp-pages-manual');
    if(!pb){
      pb=document.createElement('div'); pb.id='mp-pages-manual'; pb.style.cssText='margin-bottom:8px;';
      pb.innerHTML='<label style="font-size:.74rem;font-weight:700;color:var(--grt);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:4px;">Nombre de pages <span style="color:var(--or);font-weight:400;">(auto via PDF)</span></label>'
        +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">'
        +'<input type="number" id="pp-qty" min="1" value="1" readonly style="border:2px solid var(--gr2);border-radius:10px;padding:8px 14px;font-family:Nunito,sans-serif;font-size:.9rem;width:110px;background:#f5f5f5;color:#888;cursor:not-allowed;">'
        +'<span style="font-size:.78rem;color:var(--grt);">pages — Uploadez votre PDF pour détecter automatiquement</span></div>'
        +'<label style="font-size:.74rem;font-weight:700;color:var(--grt);text-transform:uppercase;letter-spacing:.5px;display:block;margin:10px 0 4px;">Nombre d\'exemplaires</label>'
        +'<div style="display:flex;align-items:center;gap:8px;">'
        +'<input type="number" id="pp-exemplaires" min="1" value="1" style="border:2px solid var(--gr2);border-radius:10px;padding:8px 14px;font-family:Nunito,sans-serif;font-size:.9rem;width:110px;">'
        +'<span style="font-size:.78rem;color:var(--grt);">exemplaire(s)</span></div>';
      qsec.parentNode.insertBefore(pb,qsec);
      var ppQty=document.getElementById('pp-qty');
      if(ppQty) ppQty.addEventListener('input',function(){majPrixPopup();});
    }
    pb.style.display='block'; document.getElementById('pp-qty').value='1';
  } else if(prod.prixSpecial){
    qsec.style.display='block';
    var pbS=document.getElementById('mp-pages-manual'); if(pbS) pbS.style.display='none';
    function majQS(){
      var fEl=document.getElementById('mpo_Format'),iEl=document.getElementById('mpo_Impression');
      var fmt=fEl?fEl.value:'A4', imp=iEl?iEl.value:'Recto', qs=[];
      if(prod.id==='affiche'){var TAF_MAP={'A4':TAF_A4,'A3':TAF_A3,'A2':TAF_A2,'A1':TAF_A1,'A0':TAF_A0};var t=TAF_MAP[fmt];if(t){var d=t[imp]||(t['Recto']);if(d)qs=d.Q;}}
      else if(prod.id==='menu-resto'){var TM={'Simple A5':TMENU_A5,'Simple A4':TMENU_A4,'Dépliant A4 (1 pli)':TMENU_DEP_A4,'Dépliant A3 (1 pli)':TMENU_DEP_A3};var tm=TM[fmt];if(tm)qs=tm.Q;}
      if(!qs.length) qs=[5,10,25,50,100,250,500];
      qbtns.innerHTML=qs.map(function(q){return '<button type="button" class="qbtn" data-q="'+q+'">'+q+'</button>';}).join('');
      qinp.style.display='none'; qinp.value='';
    }
    setTimeout(function(){
      majQS();
      var fS=document.getElementById('mpo_Format'),iS=document.getElementById('mpo_Impression');
      if(fS)fS.addEventListener('change',function(){majQS();majPrixPopup();});
      if(iS)iS.addEventListener('change',function(){majQS();majPrixPopup();});
    },0);
  } else if(prod.Q){
    qsec.style.display='block';
    var pbB=document.getElementById('mp-pages-manual'); if(pbB) pbB.style.display='none';
    qbtns.innerHTML=prod.Q.map(function(q){return '<button type="button" class="qbtn" data-q="'+q+'">'+q+' ex.</button>';}).join('')
      +'<button type="button" class="qbtn" data-q="autre">Autre quantité</button>';
    qinp.style.display='none'; qinp.value=''; qbtns.querySelectorAll('.qbtn').forEach(function(b){b.classList.remove('on');});
  } else {
    qsec.style.display='none';
    var pbN=document.getElementById('mp-pages-manual'); if(pbN) pbN.style.display='none';
  }
  var optsEl=document.getElementById('mp-opts');
  optsEl.innerHTML=Object.entries(prod.opts||{}).map(function(e){
    return '<div class="ogrp"><label>'+e[0]+'</label><select id="mpo_'+e[0].replace(/[^a-z0-9]/gi,'_')+'"><option>'+e[1].join('</option><option>')+'</option></select></div>';
  }).join('');
  var hasDims=prod.dims||prod.dimsLibres;
  document.getElementById('mp-dims').style.display=hasDims?'flex':'none';
  if(hasDims){
    var lEl=document.getElementById('mp-larg'),hEl=document.getElementById('mp-haut');
    if(lEl){lEl.min='50';lEl.placeholder=prod.dimsLibres?'ex: 200 (min 50)':'';}
    if(hEl){hEl.min='50';hEl.placeholder=prod.dimsLibres?'ex: 150 (min 50)':'';}
  }
  document.getElementById('mp-larg').value='';
  document.getElementById('mp-haut').value='';
  document.getElementById('mp-prix').textContent='—';
  document.getElementById('mp-file').value='';
  document.getElementById('mp-fname').textContent='';
  // Bannière comperso + prévisualisation textile
  var isComperso = cat === 'comperso';
  var isTextile  = ['tshirt','tshirt-broderie','polo','veste','chemise'].indexOf(pid) > -1;
  var bannerC = document.getElementById('banner-comperso');
  var prevT   = document.getElementById('mp-textile-preview');
  if (bannerC) bannerC.style.display = isComperso ? 'block' : 'none';
  if (prevT)   prevT.style.display   = isTextile  ? 'block' : 'none';

  // Reset textile preview
  if (isTextile) {
    var pImg = document.getElementById('textile-preview-img');
    var pCtrl = document.getElementById('textile-pos-controls');
    if (pImg)  { pImg.style.display = 'none'; pImg.src = ''; }
    if (pCtrl) pCtrl.style.display = 'none';
    // Sélectionner poitrine gauche par défaut
    document.querySelectorAll('.pos-btn').forEach(function(b) {
      b.style.background = b.dataset.zone === 'poitrine-g' ? '#F47B20' : '#f0f0f0';
      b.style.color      = b.dataset.zone === 'poitrine-g' ? '#fff' : '#555';
      b.classList.toggle('on', b.dataset.zone === 'poitrine-g');
    });
    var pl = document.getElementById('textile-pos-label');
    if (pl) pl.textContent = 'Poitrine gauche';
  }

  document.getElementById('m-produit').classList.add('open');
}

// ===== ENVOI PRÉ-COMMANDE =====
function envoyerPC(){
  var prenom=document.getElementById('c-prenom').value.trim();
  var email=document.getElementById('c-email').value.trim();
  var tc='Particulier';
  var radiosTC=document.getElementsByName('tc');
  for(var ri2=0;ri2<radiosTC.length;ri2++){if(radiosTC[ri2].checked){tc=radiosTC[ri2].value;break;}}
  var siret=document.getElementById('c-siret').value.trim();
  if(!prenom||!email){toast('⚠️ Prénom et email requis');return;}
  if(!panier.length){toast('⚠️ Votre panier est vide');return;}
  if(tc==='Professionnel'&&!siret){toast('⚠️ Numéro SIRET requis');return;}
  var payableItems=getPayableItems();
  var allPayable=payableItems.length>0; // payer si au moins 1 article à prix fixe
  if(allPayable&&typeof ouvrirPaiementStripe==='function'){
    var totalCmd=payableItems.reduce(function(sum,i){
      var m=(i.prix||'').match(/^([0-9]+[,.][0-9]+)/);
      if(!m) m=(i.prix||'').match(/([0-9]+[,.][0-9]+)/);
      return sum+(m?parseFloat(m[1].replace(',','.')):0);
    },0);
    if(totalCmd<0.50){toast('⚠️ Montant minimum : 0,50 €.');return;}
    var detailCmd=payableItems.map(function(i){return i.nom+' — '+i.qte;}).join(', ');
    var montantAffiche=totalCmd.toFixed(2).replace('.',',')+' €';
    var _adresse=(document.getElementById('c-adresse')||{}).value||'';
    var _cp=(document.getElementById('c-cp')||{}).value||'';
    var _ville=(document.getElementById('c-ville')||{}).value||'';
    window._pendingPC={prenom:prenom,nom:document.getElementById('c-nom').value.trim(),
      email:email,tel:document.getElementById('c-tel').value.trim(),tc:tc,siret:siret,
      msg:document.getElementById('c-msg').value.trim(),
      adresse:_adresse+(_cp?' - '+_cp:'')+(_ville?' '+_ville:''),prixTotal:montantAffiche};
    window._panierSnapshot=panier.slice();
    stripeReturnStep=currentStep||4;
    ouvrirPaiementStripe(Math.round(totalCmd*100),montantAffiche,detailCmd);
    return;
  }
  var btn=document.getElementById('btn-send');
  var st=document.getElementById('est-status');
  btn.disabled=true; btn.innerHTML='<span class="spin"></span>Envoi en cours…';
  st.style.display='block'; st.className='load'; st.textContent='Envoi de votre commande…';
  var fd=new FormData();
  fd.append('prenom',prenom);
  fd.append('nom',document.getElementById('c-nom').value.trim());
  fd.append('email',email);
  fd.append('tel',document.getElementById('c-tel').value.trim());
  var adresse=(document.getElementById('c-adresse')||{}).value||'';
  var cp=(document.getElementById('c-cp')||{}).value||'';
  var ville=(document.getElementById('c-ville')||{}).value||'';
  if(adresse||cp||ville) fd.append('adresse',adresse+(cp?' - '+cp:'')+(ville?' '+ville:''));
  fd.append('type_client',tc); fd.append('siret',siret);
  fd.append('message',document.getElementById('c-msg').value.trim());
  var resume=panier.map(function(i){
    var opts=Object.entries(i.sels).map(function(e){return e[0]+': '+e[1];}).join(', ');
    return i.nom+' — '+opts+' — Qté: '+i.qte+' — Prix: '+i.prix+(i.fichier?' [fichier: '+i.fichier+']':'');
  }).join('\n');
  fd.append('panier',resume); fd.append('prix_total',totalPanier()); fd.append('source','com-impression');
  panier.forEach(function(i){if(i.fichierObjs)i.fichierObjs.forEach(function(f){fd.append('fichiers',f,f.name);});});
  fetch(API_BASE+'/api/devis',{method:'POST',body:fd})
  .then(function(res){if(!res.ok)throw new Error('Erreur serveur '+res.status);panier=[];fichiers={};uid=0;majBadge();goStep('ok');})
  .catch(function(err){st.className='err';st.textContent='❌ '+err.message+' — Veuillez réessayer.';btn.disabled=false;btn.innerHTML='✉️ Valider ma commande';});
}

document.addEventListener('DOMContentLoaded',function(){
  appliquerIncidentUi();
  chargerIncidentState(true);
  var t=document.getElementById('ci-toast');
  function toast2(msg){if(!t)return;t.textContent=msg;t.classList.add('show');clearTimeout(t._timer);t._timer=setTimeout(function(){t.classList.remove('show');},3200);}
  window.toast=toast2;
  function on(id,evt,handler){
    var el=document.getElementById(id);
    if(el) el.addEventListener(evt,handler);
    return el;
  }
  function openIfExists(id){
    var el=document.getElementById(id);
    if(el) el.classList.add('open');
  }

  // Fermetures modales
  on('close-mp','click',function(){document.getElementById('m-produit').classList.remove('open');});
  on('close-mp2','click',function(){document.getElementById('m-produit').classList.remove('open');});
  on('m-produit','click',function(e){if(e.target===this)this.classList.remove('open');});
  on('mp-add-btn','click',ajouterDepuisPopup);
  on('mp-qbtns','click',function(e){
    var btn=e.target.closest('.qbtn'); if(!btn) return;
    this.querySelectorAll('.qbtn').forEach(function(b){b.classList.remove('on');});
    btn.classList.add('on');
    document.getElementById('mp-qinput').style.display=btn.dataset.q==='autre'?'block':'none';
    majPrixPopup();
  });
  on('mp-qinput','input',majPrixPopup);
  on('mp-opts','change',majPrixPopup);
  on('mp-larg','input',majPrixPopup);
  on('mp-haut','input',majPrixPopup);
  on('mp-file','change',function(){
    var selected=Array.prototype.slice.call(this.files||[]); if(!selected.length) return;
    var tooBig=selected.some(function(file){ return file.size>70*1024*1024; });
    if(tooBig){toast('⚠️ Fichier trop lourd (max 70 Mo).');this.value='';return;}
    mpFichiers=selected;
    document.getElementById('mp-fname').textContent='📎 '+selected.map(function(file){ return file.name; }).join(', ');
  });

  // Navigation
  on('nav-accueil','click',function(e){e.preventDefault();window.scrollTo({top:0,behavior:'smooth'});});
  on('nav-contact','click',function(e){e.preventDefault();openIfExists('m-contact');});
  on('nav-precommande','click',function(e){e.preventDefault();ouvrirModal();});
  function ouvrirCategorieMenu(cat){
    ouvrirModal();
    catCur=cat;
    document.querySelectorAll('.cbtn').forEach(function(b){b.classList.toggle('on',b.dataset.cat===cat);});
    renderProduits(cat);
    goStep(2);
  }
  [
    ['nav-compro','compro'],
    ['nav-comext','comext'],
    ['nav-comperso','comperso'],
    ['nav-comevt','comevt'],
    ['nav-comservices','comservices']
  ].forEach(function(pair){
    var el=document.getElementById(pair[0]);
    if(el)el.addEventListener('click',function(e){e.preventDefault();ouvrirCategorieMenu(pair[1]);});
  });
  var heroBtn=document.getElementById('hero-pc-btn'); if(heroBtn) heroBtn.addEventListener('click',function(e){e.preventDefault();ouvrirModal();});
  var productsGrid=document.getElementById('products-grid');
  if(productsGrid)productsGrid.addEventListener('click',function(e){
    var card=e.target.closest('[data-cat][data-id], [data-cat][data-pid]');
    if(!card)return;
    ouvrirPopupProduit(card.getAttribute('data-cat'),card.getAttribute('data-id')||card.getAttribute('data-pid'));
  });
  chargerSiteConfig();
  chargerAvisPublic();
  var footerPc=document.getElementById('footer-pc'); if(footerPc) footerPc.addEventListener('click',function(e){e.preventDefault();ouvrirModal();});
  var footerContact=document.getElementById('footer-contact'); if(footerContact) footerContact.addEventListener('click',function(e){e.preventDefault();openIfExists('m-contact');});

  // Mon compte (bouton nav fusionné)
  var btnCompte=document.getElementById('nav-compte');
  if(btnCompte) btnCompte.addEventListener('click',function(e){
    e.preventDefault();
    var mCompte=document.getElementById('m-compte'); if(!mCompte) return;
    mCompte.classList.add('open');
    // Si déjà connecté, afficher le dashboard
    var sess=localStorage.getItem('ci_session_token');
    if(sess){ afficherMCDash(); chargerMCData(sess); }
    else { afficherMCLogin(); }
  });

  // Fermetures modales standard
  on('close-pc','click',fermerModal);
  on('close-panier','click',function(){document.getElementById('m-panier').classList.remove('open');});
  on('close-panier2','click',function(){document.getElementById('m-panier').classList.remove('open');});
  on('close-contact','click',function(){document.getElementById('m-contact').classList.remove('open');});
  on('close-ok','click',fermerModal);
  ['m-pc','m-panier','m-contact','m-compte','m-avis'].forEach(function(id){
    var el=document.getElementById(id); if(el) el.addEventListener('click',function(e){if(e.target===this)this.classList.remove('open');});
  });
  ['close-mc-login','close-mc-register','close-mc-forgot','close-mc-reset','close-mc-dash','close-mc-suivi'].forEach(function(id){
    var el=document.getElementById(id); if(el) el.addEventListener('click',function(){document.getElementById('m-compte').classList.remove('open');});
  });

  // Steps navigation
  on('back-to-cat','click',function(){goStep(1);});
  on('back-to-cat2','click',function(){goStep(1);});
  on('to-step3','click',function(){goStep(3);});
  on('to-step4','click',function(){goStep(4);});
  on('back-to-recap','click',function(){goStep(3);});
  on('btn-send','click',envoyerPC);
  on('panier-to-pc','click',function(){document.getElementById('m-panier').classList.remove('open');ouvrirModal();goStep(3);});

  // Catégories
  on('cgrid','click',function(e){
    var btn=e.target.closest('.cbtn'); if(!btn) return;
    var cat=btn.dataset.cat; catCur=cat;
    document.querySelectorAll('.cbtn').forEach(function(b){b.classList.remove('on');});
    btn.classList.add('on'); renderProduits(cat); goStep(2);
  });

  // Produits homepage
  var pgrid=document.querySelector('.pgrid');
  if(pgrid) pgrid.addEventListener('click',function(e){
    var card=e.target.closest('.pcard'); if(!card) return;
    var cat=card.dataset.cat,pid=card.dataset.pid||card.dataset.id;
    if(!cat||!pid){ouvrirModal();return;}
    ouvrirPopupProduit(cat,pid);
  });

  // Event delegation global
  document.addEventListener('click',function(e){
    var del=e.target.closest('[data-del]');
    if(del){var id=parseInt(del.getAttribute('data-del'));panier=panier.filter(function(i){return i.id!==id;});majBadge();majRecap();majPanierFl();return;}
    var pcm=e.target.closest('.pcard-modal');
    if(pcm){var cat2=pcm.dataset.cat,pid2=pcm.dataset.pid;if(cat2&&pid2)ouvrirPopupProduit(cat2,pid2);return;}
    // Onglets Mon compte
    var tab=e.target.closest('.mc-tab');
    if(tab){
      document.querySelectorAll('.mc-tab').forEach(function(t){t.style.borderBottomColor='transparent';t.style.color='#888';});
      tab.style.borderBottomColor='var(--or)';tab.style.color='var(--or)';
      var tn=tab.dataset.tab;
      var tc=document.getElementById('mc-tab-commandes'); if(tc) tc.style.display=tn==='commandes'?'block':'none';
      var tp=document.getElementById('mc-tab-points'); if(tp) tp.style.display=tn==='points'?'block':'none';
    }
  });

  // Radio SIRET
  var radios=document.getElementsByName('tc');
  for(var ri=0;ri<radios.length;ri++){
    radios[ri].addEventListener('change',function(){var bs=document.getElementById('bloc-siret');if(bs)bs.style.display=this.value==='Professionnel'?'block':'none';});
  }

  // Contact
  var btnContact=document.getElementById('btn-contact-send');
  if(btnContact) btnContact.addEventListener('click',function(){
    var nom=(document.getElementById('ct-nom')||{}).value||'';
    var email=(document.getElementById('ct-email')||{}).value||'';
    var msg=(document.getElementById('ct-msg')||{}).value||'';
    var sujet=(document.getElementById('ct-sujet')||{}).value||'';
    if(!nom||!email||!msg){toast('Remplissez tous les champs obligatoires');return;}
    var btn=this; btn.disabled=true; btn.textContent='Envoi en cours...';
    var fd=new FormData();
    fd.append('prenom',nom);fd.append('email',email);fd.append('panier','Contact — Sujet: '+sujet);fd.append('message',msg);fd.append('prix_total','-');fd.append('source','com-impression');
    fetch(API_BASE+'/api/devis',{method:'POST',body:fd})
    .then(function(r){if(!r.ok)throw new Error('Erreur');document.getElementById('m-contact').classList.remove('open');btn.disabled=false;btn.textContent='Envoyer';toast('Message envoyé ! Réponse sous 48h.');})
    .catch(function(){btn.disabled=false;btn.textContent='Envoyer';toast('Erreur envoi. Réessayez.');});
  });

  // Partenariat
  var btnPart=document.getElementById('btn-part');
  if(btnPart) btnPart.addEventListener('click',function(){
    var nom=(document.getElementById('pnom')||{}).value||'',email=(document.getElementById('pemail')||{}).value||'';
    var struct=(document.getElementById('pstruct')||{}).value||'',type=(document.getElementById('ptype')||{}).value||'',msg=(document.getElementById('pmsg')||{}).value||'';
    if(!nom||!email){toast('⚠️ Nom et email requis');return;}
    var btn=this; btn.disabled=true; btn.textContent='⏳ Envoi…';
    var fd=new FormData();
    fd.append('prenom',nom);fd.append('email',email);fd.append('panier','Partenariat — Type: '+type+(struct?' — Structure: '+struct:''));fd.append('message',msg||'Pas de message');fd.append('prix_total','—');fd.append('source','com-impression');if(struct)fd.append('nom',struct);
    fetch(API_BASE+'/api/devis',{method:'POST',body:fd})
    .then(function(){toast('✅ Demande envoyée ! Réponse sous 48h.');['pnom','pemail','pstruct','pmsg'].forEach(function(id){var el=document.getElementById(id);if(el)el.value='';});btn.disabled=false;btn.textContent='✉️ Envoyer ma demande';})
    .catch(function(){toast('❌ Erreur envoi.');btn.disabled=false;btn.textContent='✉️ Envoyer ma demande';});
  });

  // Scroll smooth
  (function(){var aa=document.getElementsByTagName('a');for(var i=0;i<aa.length;i++){(function(a){var h=a.getAttribute('href');if(h&&h.charAt(0)==='#'&&h.length>1){a.addEventListener('click',function(e){var tgt=document.getElementById(h.slice(1));if(tgt){e.preventDefault();tgt.scrollIntoView({behavior:'smooth'});}});};})(aa[i]);}})();

  // Vérifier lien magique dans l'URL (espace client)
  var urlP=new URLSearchParams(window.location.search);
  var verifyToken=urlP.get('verify_client_token');
  if(verifyToken){
    fetch(API_BASE+'/api/client/verify?token='+verifyToken)
    .then(function(r){return r.json();})
    .then(function(d){
      if(d.success){
        localStorage.setItem('ci_session_token',d.session_token);
        window.history.replaceState({},'',window.location.pathname);
        toast('✅ Compte confirmé ! Bienvenue '+(d.client.prenom||''));
        var mCompte=document.getElementById('m-compte');
        if(mCompte){afficherMCDash();chargerMCData(d.session_token);mCompte.classList.add('open');}
      } else toast('❌ '+(d.error||'Lien expiré — demandez un nouveau lien.'));
    }).catch(function(){});
  } else {
    var ct=urlP.get('client_token');
    if(ct){
      fetch(API_BASE+'/api/client/auth?token='+ct)
      .then(function(r){return r.json();})
      .then(function(d){
        if(d.success){
          localStorage.setItem('ci_session_token',d.session_token);
          window.history.replaceState({},'',window.location.pathname);
          toast('✅ Connexion réussie ! Bienvenue '+(d.client.prenom||''));
          var mCompte=document.getElementById('m-compte');
          if(mCompte){afficherMCDash();chargerMCData(d.session_token);mCompte.classList.add('open');}
        } else toast('❌ '+(d.error||'Lien expiré — demandez un nouveau lien.'));
      }).catch(function(){});
    }
  }

}); // fin DOMContentLoaded principal

// ===== COOKIES =====
document.addEventListener('DOMContentLoaded',function(){
  function sauveConsentement(analytics,prefs){
    localStorage.setItem('ci_cookie_consent',JSON.stringify({essential:true,analytics:analytics,prefs:prefs,date:new Date().toISOString()}));
    var banner=document.getElementById('cookie-banner');var modal=document.getElementById('cookie-modal');
    if(banner)banner.classList.add('hidden');if(modal)modal.classList.remove('open');
  }
  var consent=localStorage.getItem('ci_cookie_consent');
  var banner=document.getElementById('cookie-banner');
  if(banner) banner.style.display=consent?'none':'';
  var ba=document.getElementById('btn-cookie-accept'),ba2=document.getElementById('btn-cookie-accept2'),
      br=document.getElementById('btn-cookie-refuse'),bs=document.getElementById('btn-cookie-save'),
      bp=document.getElementById('btn-cookie-perso'),bc=document.getElementById('btn-cookie-close'),
      mc=document.getElementById('cookie-modal');
  if(ba) ba.addEventListener('click',function(){sauveConsentement(true,true);});
  if(ba2) ba2.addEventListener('click',function(){sauveConsentement(true,true);});
  if(br) br.addEventListener('click',function(){sauveConsentement(false,false);});
  if(bs) bs.addEventListener('click',function(){var a=document.getElementById('toggle-analytics'),p=document.getElementById('toggle-prefs');sauveConsentement(a?a.checked:false,p?p.checked:false);});
  if(bp) bp.addEventListener('click',function(){if(mc)mc.classList.add('open');});
  if(bc) bc.addEventListener('click',function(){if(mc)mc.classList.remove('open');});
  if(mc) mc.addEventListener('click',function(e){if(e.target===this)this.classList.remove('open');});
});

// ===== RECHERCHE PRODUITS =====
document.addEventListener('DOMContentLoaded',function(){
  var sI=document.getElementById('search-prod'),sCl=document.getElementById('search-prod-clear');
  function filtrer(q){
    q=(q||'').toLowerCase().trim();
    var list=document.getElementById('plist-modal'); if(!list) return;
    var cards=list.getElementsByClassName('pcard-modal'),visible=0;
    for(var i=0;i<cards.length;i++){
      var nom=cards[i].getElementsByClassName('pnom-m')[0]; if(!nom) continue;
      var match=!q||nom.textContent.toLowerCase().indexOf(q)>-1;
      cards[i].style.display=match?'':'none'; if(match) visible++;
    }
    var nr=document.getElementById('no-result-box');
    if(!nr){nr=document.createElement('div');nr.id='no-result-box';nr.className='no-result-box';
      nr.innerHTML='<p>On ne le propose pas encore... mais on peut l\'imprimer !</p><button class="btn-devis-contact" id="btn-demande-devis">📨 Demandez-le nous</button>';
      if(list.parentNode)list.parentNode.insertBefore(nr,list.nextSibling);}
    nr.style.display=(visible===0&&q)?'block':'none';
    var bd=document.getElementById('btn-demande-devis');
    if(bd)bd.onclick=function(){var mc=document.getElementById('m-contact');if(mc)mc.classList.add('open');};
    if(sCl)sCl.className='search-prod-clear'+(q?' visible':'');
  }
  if(sI)sI.addEventListener('input',function(){filtrer(this.value);});
  if(sCl)sCl.addEventListener('click',function(){if(sI){sI.value='';sI.focus();}filtrer('');});
  var cgrid=document.getElementById('cgrid');
  if(cgrid)cgrid.addEventListener('click',function(){if(sI)sI.value='';if(sCl)sCl.className='search-prod-clear';var nr=document.getElementById('no-result-box');if(nr)nr.style.display='none';});
});

// ===== AUTOCOMPLETE RECHERCHE GLOBALE =====
document.addEventListener('DOMContentLoaded',function(){
  setTimeout(function(){
    var CATALOGUE_SEARCH=[
      {cat:'compro',id:'carte-cd',nom:'Carte de visite coin droit',prix:'dès 15,49 €',tags:'carte visite coin droit pro'},
      {cat:'compro',id:'flyer-a5',nom:'Flyer A5',prix:'dès 27,49 €',tags:'flyer tract a5 prospectus'},
      {cat:'compro',id:'flyer-a6',nom:'Flyer A6',prix:'dès 25,90 €',tags:'flyer tract a6 petit'},
      {cat:'compro',id:'affiche',nom:'Affiche',prix:'dès 22,90 €',tags:'affiche poster a4 a3 a2 a1 a0'},
      {cat:'compro',id:'depliant',nom:'Dépliant',prix:'dès 72,90 €',tags:'depliant pli brochure'},
      {cat:'compro',id:'brochure-a4',nom:'Brochure A4',prix:'dès 63,90 €',tags:'brochure catalogue agrafee a4'},
      {cat:'compro',id:'enveloppe',nom:'Enveloppe',prix:'dès 75,90 €',tags:'enveloppe dl c5 c4 courrier'},
      {cat:'compro',id:'set-table',nom:'Set de table',prix:'dès 35,90 €',tags:'set table restaurant nappe'},
      {cat:'comext',id:'bache-ss-oe',nom:'Bâche sans œillet',prix:'dès 36,49 €',tags:'bache banderole pvc exterieur'},
      {cat:'comext',id:'bache-av-oe',nom:'Bâche avec œillets',prix:'dès 37,49 €',tags:'bache oeillets pvc exterieur'},
      {cat:'comext',id:'beach-flag',nom:'Beach Flag Plume',prix:'dès 134,49 €',tags:'beach flag plume oriflamme drapeau'},
      {cat:'comext',id:'rollup-ext',nom:'Roll-Up Extérieur',prix:'dès 273,90 €',tags:'rollup exterieur stand'},
      {cat:'comext',id:'barnum',nom:'Barnum 3×3m',prix:'dès 2 087,90 €',tags:'barnum tente chapiteau'},
      {cat:'comext',id:'akylux-ss',nom:'Panneau Akylux',prix:'dès 43,90 €',tags:'panneau akylux alveolaire rigide'},
      {cat:'comperso',id:'tshirt',nom:'T-shirts',prix:'des 12 EUR',tags:'tshirt vetement textile impression'},
      {cat:'comperso',id:'polo',nom:'Polo',prix:'des 18 EUR',tags:'polo broderie entreprise'},
      {cat:'comperso',id:'mug',nom:'Mug',prix:'des 5 EUR/u',tags:'mug tasse ceramique personnalise'},
      {cat:'comperso',id:'totebag',nom:'Tote bag',prix:'des 4 EUR/u',tags:'tote bag sac tissu coton'},
      {cat:'comevt',id:'faire-part-a5',nom:'Faire-Part A5',prix:'dès 48,90 €',tags:'faire part a5 mariage bapteme naissance ceremonie'},
      {cat:'comevt',id:'faire-part-a6-evt',nom:'Faire-Part A6',prix:'dès 45,90 €',tags:'faire part a6 mariage bapteme naissance'},
      {cat:'comevt',id:'carte-invit',nom:'Carte d\'invitation',prix:'dès 45,49 €',tags:'invitation carte reponse mariage ceremonie'},
      {cat:'comevt',id:'carte-remerci',nom:'Carte de Remerciement',prix:'dès 45,90 €',tags:'remerciement merci carte mariage'},
      {cat:'comevt',id:'magnet-save',nom:'Magnet Save The Date',prix:'dès 57,90 €',tags:'magnet save the date aimant mariage'},
      {cat:'comevt',id:'menu-evt-carte',nom:'Menu Carte',prix:'dès 32,49 €',tags:'menu carte restaurant mariage table'},
      {cat:'comevt',id:'gobelet-evt',nom:'Gobelet Personnalisé',prix:'dès 47,90 €',tags:'gobelet verre personnalise mariage fete'},
      {cat:'comevt',id:'plan-table',nom:'Plan de Table',prix:'dès 43,49 €',tags:'plan table mariage placement'},
      {cat:'comevt',id:'panneau-bienv',nom:'Panneau de Bienvenue',prix:'dès 36,49 €',tags:'panneau bienvenue accueil welcome mariage'},
      {cat:'comevt',id:'rollup-evt',nom:'Roll-Up',prix:'dès 44,90 €',tags:'rollup enrouleur stand salon'},
      {cat:'comevt',id:'beach-flag-evt',nom:'Beach Flag',prix:'dès 87,90 €',tags:'beach flag drapeau plume evenement'},
      {cat:'comevt',id:'totebag-evt',nom:'Tote Bag',prix:'dès 52,90 €',tags:'tote bag sac coton cadeau invite'},
      {cat:'comservices',id:'impression-doc',nom:'Impression de document',prix:'dès 0,05 €/page',tags:'impression document copie a4'},
      {cat:'comservices',id:'plastif-a4',nom:'Plastification A4',prix:'0,50 €/u',tags:'plastification plastifier a4 protection'},
      {cat:'comservices',id:'photo-10x15-bri',nom:'Photo 10×15 Brillant',prix:'0,22 €/u',tags:'photo 10x15 brillant tirage impression'},
      {cat:'comservices',id:'photo-13x18-bri',nom:'Photo 13×18 Brillant',prix:'0,52 €/u',tags:'photo 13x18 brillant tirage grand'},
      {cat:'comservices',id:'photo-10x15-sat',nom:'Photo 10×15 Satin',prix:'0,55 €/u',tags:'photo 10x15 satin mat tirage'},
      {cat:'comservices',id:'photo-a4-sat',nom:'Photo A4 Satin',prix:'1,52 €/u',tags:'photo a4 satin mat tirage grand'},
      {cat:'comservices',id:'photo-a4-bri',nom:'Photo A4 Brillant',prix:'0,64 €/u',tags:'photo a4 brillant tirage grand'}
    ];
    var input=document.getElementById('search-global-input');
    var sugBox=document.getElementById('search-suggestions');
    var btn=document.getElementById('search-global-btn');
    function afficherSug(q){
      if(!sugBox)return;
      if(!q||q.length<2){sugBox.classList.remove('open');return;}
      var res=CATALOGUE_SEARCH.filter(function(p){return (p.nom+' '+p.tags).toLowerCase().indexOf(q.toLowerCase())>-1;}).slice(0,6);
      if(!res.length){sugBox.innerHTML='<div class="sug-item sug-contact"><span class="sug-nom">Produit non trouvé — Contactez-nous !</span></div>';sugBox.classList.add('open');return;}
      sugBox.innerHTML=res.map(function(p){
        return '<div class="sug-item" data-cat="'+p.cat+'" data-id="'+p.id+'">'
          +'<span class="sug-nom">'+p.nom+'</span><span class="sug-prix">'+p.prix+'</span></div>';
      }).join('');
      sugBox.classList.add('open');
      sugBox.querySelectorAll('.sug-item').forEach(function(item){
        item.addEventListener('click',function(){
          var cat=this.getAttribute('data-cat'),pid=this.getAttribute('data-id');
          sugBox.classList.remove('open');if(input)input.value='';
          if(cat&&pid)ouvrirPopupProduit(cat,pid);
          else{var mc=document.getElementById('m-contact');if(mc)mc.classList.add('open');}
        });
      });
    }
    if(input){
      input.addEventListener('input',function(){afficherSug(this.value);});
      input.addEventListener('keydown',function(e){
        if(e.key!=='Enter')return;
        sugBox.classList.remove('open');var q=this.value.trim();if(!q)return;
        var r=CATALOGUE_SEARCH.filter(function(p){return (p.nom+' '+p.tags).toLowerCase().indexOf(q.toLowerCase())>-1;});
        if(r.length)ouvrirPopupProduit(r[0].cat,r[0].id);
        else{var mc=document.getElementById('m-contact');if(mc)mc.classList.add('open');}
        this.value='';
      });
    }
    if(btn)btn.addEventListener('click',function(){if(!input)return;var q=input.value.trim();sugBox.classList.remove('open');if(!q)return;var r=CATALOGUE_SEARCH.filter(function(p){return (p.nom+' '+p.tags).toLowerCase().indexOf(q.toLowerCase())>-1;});if(r.length)ouvrirPopupProduit(r[0].cat,r[0].id);else{var mc=document.getElementById('m-contact');if(mc)mc.classList.add('open');}input.value='';});
    document.addEventListener('click',function(e){if(sugBox&&input&&!input.contains(e.target)&&!sugBox.contains(e.target))sugBox.classList.remove('open');});
  },400);
});

// ===== ADMIN MODAL =====
document.addEventListener('DOMContentLoaded',function(){
  var legacyAdmin=document.getElementById('m-admin');
  if(legacyAdmin) legacyAdmin.remove();
});

// ===== AVIS CLIENTS =====
document.addEventListener('DOMContentLoaded',function(){
  var btnOpen=document.getElementById('btn-open-avis');
  var closeBtn=document.getElementById('close-avis');
  var modal=document.getElementById('m-avis');
  var btnAvis=document.getElementById('avis-submit');
  if(btnOpen&&modal) btnOpen.addEventListener('click',function(){ modal.classList.add('open'); });
  if(closeBtn&&modal) closeBtn.addEventListener('click',function(){ modal.classList.remove('open'); });
  if(modal) modal.addEventListener('click',function(e){ if(e.target===modal) modal.classList.remove('open'); });
  if(!btnAvis) return;
  btnAvis.addEventListener('click',function(){
    var prenom=(document.getElementById('avis-nom').value||'').trim();
    var ville=(document.getElementById('avis-ville').value||'').trim();
    var produit=(document.getElementById('avis-produit').value||'').trim();
    var note=(document.getElementById('avis-note').value||'5').trim();
    var texte=(document.getElementById('avis-texte').value||'').trim();
    var st=document.getElementById('avis-status');
    if(!prenom||!texte){ if(st){ st.style.display='block'; st.style.background='#fee2e2'; st.style.color='#991b1b'; st.textContent='⚠️ Prénom et commentaire requis.'; } return; }
    var btn=this; btn.disabled=true; btn.textContent='Envoi...';
    fetch(API_BASE+'/api/avis',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({prenom:prenom,ville:ville,produit:produit,note:parseInt(note,10)||5,texte:texte})
    })
    .then(function(r){ return r.json(); })
    .then(function(d){
      btn.disabled=false; btn.textContent='Envoyer mon avis ⭐';
      if(st) st.style.display='block';
      if(d.success){
        if(st){ st.style.background='#d1fae5'; st.style.color='#065f46'; st.textContent='✅ Merci ! Votre avis sera publié après validation.'; }
        document.getElementById('avis-nom').value='';
        document.getElementById('avis-ville').value='';
        document.getElementById('avis-produit').value='';
        document.getElementById('avis-texte').value='';
      } else if(st){
        st.style.background='#fee2e2'; st.style.color='#991b1b'; st.textContent='❌ '+(d.error||'Réessayez');
      }
    })
    .catch(function(){
      btn.disabled=false; btn.textContent='Envoyer mon avis ⭐';
      if(st){ st.style.display='block'; st.style.background='#fee2e2'; st.style.color='#991b1b'; st.textContent='❌ Erreur réseau.'; }
    });
  });
});

// ===== STRIPE =====
document.addEventListener('DOMContentLoaded',function(){
  var stripe=null,stripeCard=null;
  var STRIPE_PK='pk_live_51Sos39FgB4FDXQyBFU0UvkiZIwi8FYFVRTelLKs40vGl8VKJRg0T9E6MClXVEUMDOYbgONTlRLUU9C1CGNLLbRqf00pO0gJPQB';
  function ouvrirPaiementStripe(montantCentimes,montantAffiche,detail){
    var modal=document.getElementById('m-stripe');if(!modal)return;
    var mpc=document.getElementById('m-pc');
    var a=document.getElementById('stripe-amount-display');if(a)a.textContent='Total à payer : '+montantAffiche;
    var d=document.getElementById('stripe-detail-display');if(d)d.textContent=detail||'';
    var s=document.getElementById('stripe-status');if(s)s.style.display='none';
    renderStripeOrderSummary(window._panierSnapshot||panier,montantAffiche);
    if(mpc) mpc.classList.remove('open');
    modal.classList.add('open');window._stripeAmount=montantCentimes;
    if(!stripe){
      stripe=Stripe(STRIPE_PK);
      var elements=stripe.elements();
      stripeCard=elements.create('card',{style:{base:{fontFamily:'Nunito,sans-serif',fontSize:'15px',color:'#1a1a1a'}}});
      stripeCard.mount('#stripe-card-element');
    }
  }
  window.ouvrirPaiementStripe=ouvrirPaiementStripe;
  window.majBandeauVendee=function(){};
  var btnC2=document.getElementById('close-stripe');var mS=document.getElementById('m-stripe');
  function fermerStripeEtRetournerFormulaire(){
    var mpc=document.getElementById('m-pc');
    if(mS) mS.classList.remove('open');
    if(mpc && window._pendingPC){
      mpc.classList.add('open');
      goStep(stripeReturnStep||4);
    }
  }
  if(btnC2)btnC2.addEventListener('click',fermerStripeEtRetournerFormulaire);
  if(mS)mS.addEventListener('click',function(e){if(e.target===this)fermerStripeEtRetournerFormulaire();});
  var btnPay=document.getElementById('btn-stripe-pay');
  if(btnPay)btnPay.addEventListener('click',function(){
    var st=document.getElementById('stripe-status');var btn=this;btn.disabled=true;btn.textContent='⏳ Traitement...';
    fetch(API_BASE+'/api/create-payment-intent',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({amount:window._stripeAmount||0,source:'com-impression'})})
    .then(function(r){return r.json();}).then(function(data){if(!data.clientSecret)throw new Error(data.error||'Pas de clientSecret');return stripe.confirmCardPayment(data.clientSecret,{payment_method:{card:stripeCard}});})
    .then(function(result){
      if(result.error){btn.disabled=false;btn.textContent='💳 Payer maintenant';if(st){st.style.display='block';st.style.background='#fee2e2';st.style.color='#991b1b';st.textContent='❌ '+result.error.message;}}
      else{
        var pc=window._pendingPC||{};var pan=window._panierSnapshot||[];var fd=new FormData();
        ['prenom','nom','email','tel','adresse'].forEach(function(k){fd.append(k,pc[k]||'');});
        fd.append('type_client',pc.tc||'Particulier');fd.append('siret',pc.siret||'');fd.append('message',pc.msg||'');
        fd.append('panier',pan.map(function(i){return i.nom+' — '+Object.entries(i.sels||{}).map(function(e){return e[0]+': '+e[1];}).join(', ')+' — '+i.qte+' — '+i.prix+(i.fichier?' [fichier: '+i.fichier+']':'');}).join('\n'));
        fd.append('prix_total',pc.prixTotal||'');fd.append('source','com-impression');
        fd.append('payment_id',result.paymentIntent.id);fd.append('payment_status','paye');
        pan.forEach(function(i){if(i.fichierObjs)i.fichierObjs.forEach(function(f){fd.append('fichiers',f,f.name);});});
        fetch(API_BASE+'/api/devis',{method:'POST',body:fd})
        .then(function(){if(mS)mS.classList.remove('open');panier=[];fichiers={};uid=0;majBadge();majRecap();majPanierFl();goStep('ok');document.getElementById('m-pc').classList.add('open');window._pendingPC=null;window._panierSnapshot=null;btn.disabled=false;btn.textContent='💳 Payer maintenant';})
        .catch(function(err){btn.disabled=false;btn.textContent='💳 Payer maintenant';if(st){st.style.display='block';st.style.background='#fee2e2';st.style.color='#991b1b';st.textContent='❌ '+(err.message||'Erreur paiement');}});
      }
    }).catch(function(err){btn.disabled=false;btn.textContent='💳 Payer maintenant';if(st){st.style.display='block';st.style.background='#fee2e2';st.style.color='#991b1b';st.textContent='❌ '+err.message;}});
  });
});

// ===== DÉPÔT DOCUMENT ADMIN =====

(function(){
document.addEventListener('DOMContentLoaded',function(){
  if(!document.getElementById('m-depot-doc')){
    var m=document.createElement('div');m.className='moverlay';m.id='m-depot-doc';
    m.innerHTML='<div class="mbox" style="max-width:480px;"><div class="mhead"><h2 style="font-size:1rem;">📄 Déposer un document</h2><button id="close-depot" style="background:rgba(255,255,255,.15);border:none;color:#fff;width:28px;height:28px;border-radius:50%;cursor:pointer;">✕</button></div><div class="mbody" style="padding:20px 24px;"><div id="depot-cmd-info" style="background:#f7f7f7;border-radius:8px;padding:8px 12px;font-size:.82rem;color:#555;margin-bottom:14px;"></div><div style="margin-bottom:10px;"><label style="font-size:.78rem;font-weight:700;color:#555;display:block;margin-bottom:4px;">Type</label><select id="depot-type" style="width:100%;border:1.5px solid #ddd;border-radius:8px;padding:8px 12px;font-family:Nunito,sans-serif;font-size:.85rem;box-sizing:border-box;"><option>Devis</option><option>Bon de commande</option><option selected>Facture</option><option>Autre</option></select></div><div style="margin-bottom:10px;"><label style="font-size:.78rem;font-weight:700;color:#555;display:block;margin-bottom:4px;">Nom du document</label><input type="text" id="depot-nom" placeholder="ex: Facture F-2026-001" style="width:100%;border:1.5px solid #ddd;border-radius:8px;padding:8px 12px;font-family:Nunito,sans-serif;font-size:.85rem;box-sizing:border-box;"></div><div style="margin-bottom:14px;"><label style="font-size:.78rem;font-weight:700;color:#555;display:block;margin-bottom:4px;">Fichier PDF *</label><input type="file" id="depot-file" accept=".pdf" style="width:100%;border:1.5px solid #ddd;border-radius:8px;padding:8px 12px;background:#fff;box-sizing:border-box;"></div><div style="margin-bottom:14px;display:flex;align-items:center;gap:8px;"><input type="checkbox" id="depot-notif" checked style="width:16px;height:16px;"><label for="depot-notif" style="font-size:.83rem;cursor:pointer;">Notifier le client par email</label></div><div id="depot-status" style="display:none;padding:8px 12px;border-radius:8px;font-size:.82rem;margin-bottom:10px;"></div><button id="depot-submit" style="width:100%;background:#6366f1;color:#fff;border:none;border-radius:50px;padding:12px;font-family:\'Baloo 2\',cursive;font-weight:800;cursor:pointer;">📤 Déposer le document</button></div></div>';
    document.body.appendChild(m);
    m.addEventListener('click',function(e){if(e.target===this)this.classList.remove('open');});
    var closeDepot=document.getElementById('close-depot');
    if(closeDepot) closeDepot.addEventListener('click',function(){m.classList.remove('open');});
  }
  window.ouvrirDepotDoc=function(cmd){
    var info=document.getElementById('depot-cmd-info');
    if(info)info.textContent='Commande : '+cmd.numero+' — '+(cmd.prenom||'')+' '+(cmd.nom||'')+' ('+(cmd.email||'')+')';
    var nomEl=document.getElementById('depot-nom');if(nomEl)nomEl.value='Facture '+cmd.numero;
    var depotStatus=document.getElementById('depot-status');
    if(depotStatus) depotStatus.style.display='none';
    var depotFile=document.getElementById('depot-file');
    if(depotFile) depotFile.value='';
    var modal=document.getElementById('m-depot-doc');
    modal.classList.add('open');modal.dataset.cmdId=cmd.id;modal.dataset.cmdNum=cmd.numero;
  };
  document.addEventListener('click',function(e){
    var btn=e.target.closest('#depot-submit');if(!btn)return;
    var modal=document.getElementById('m-depot-doc');
    var file=document.getElementById('depot-file').files[0];
    var type=document.getElementById('depot-type').value;
    var nom=(document.getElementById('depot-nom').value||'').trim()||type;
    var notif=document.getElementById('depot-notif').checked;
    var st=document.getElementById('depot-status');
    if(!file){st.style.display='block';st.style.background='#fee2e2';st.style.color='#991b1b';st.textContent='⚠️ Sélectionnez un fichier PDF.';return;}
    btn.disabled=true;btn.textContent='⏳ Dépôt...';
    var fd=new FormData();fd.append('document',file,file.name);fd.append('nom_doc',nom);fd.append('type_doc',type);fd.append('notif',notif?'true':'false');fd.append('mdp','comimpression2025');
    fetch(API_BASE+'/api/commandes/'+modal.dataset.cmdId+'/document',{method:'POST',body:fd})
    .then(function(r){return r.json();}).then(function(data){
      btn.disabled=false;btn.textContent='📤 Déposer le document';st.style.display='block';
      if(data.success){st.style.background='#d1fae5';st.style.color='#065f46';st.textContent='✅ Déposé !'+(notif?' Email envoyé.':'');setTimeout(function(){modal.classList.remove('open');},1800);}
      else{st.style.background='#fee2e2';st.style.color='#991b1b';st.textContent='❌ '+(data.error||'réessayez');}
    }).catch(function(){btn.disabled=false;btn.textContent='📤 Déposer le document';st.style.display='block';st.style.background='#fee2e2';st.style.color='#991b1b';st.textContent='❌ Erreur réseau.';});
  });
});
})();

// ===== MON COMPTE FUSIONNÉ =====
(function(){
document.addEventListener('DOMContentLoaded',function(){
  var API=API_BASE;
  var SK='ci_session_token';
  var lastClientCommandes=[];

  function h(value){
    return String(value==null?'':value).replace(/[&<>"']/g,function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c];
    });
  }
  function extractAmount(text){
    var s=String(text||'');
    var explicit=s.match(/Prix\s*:\s*([^—\[]+)/i);
    if(explicit)return explicit[1].trim();
    var amounts=s.match(/(?:dès\s*)?\d+(?:[,.]\d{1,2})?\s*€(?:\s*TTC)?/gi);
    return amounts&&amounts.length?amounts[amounts.length-1].trim():'--';
  }
  function extractQty(text){
    var s=String(text||'');
    var explicit=s.match(/Qt[ée]\s*:\s*([^—\[]+)/i);
    if(explicit)return explicit[1].trim();
    var q=s.match(/\b\d+\s*(?:ex\.?|exemplaires?|pages?|pcs?|unités?|u)\b/i);
    return q?q[0].trim():'--';
  }
  function extractFile(text){
    var s=String(text||'');
    var bracket=s.match(/\[fichier\s*:\s*([^\]]+)\]/i);
    if(bracket)return bracket[1].trim();
    var plain=s.match(/fichier\s*:\s*([^—\[]+)/i);
    return plain?plain[1].trim():'--';
  }
  function extractProduct(text){
    var s=String(text||'').trim();
    if(!s)return '--';
    return s.split('—')[0].replace(/\[fichier\s*:[^\]]+\]/i,'').trim()||s;
  }
  function rowsFromCommande(cmd){
    if(Array.isArray(cmd.lignes)&&cmd.lignes.length){
      return cmd.lignes.map(function(row){
        return {
          produit:row.produit||'--',
          fichier:row.fichier||'--',
          qte:row.qte||'--',
          montant:row.montant||'--'
        };
      });
    }
    return String(cmd.panier||'').split(/\n|\|/).map(function(l){return l.trim();}).filter(Boolean).map(function(line){
      return {produit:extractProduct(line),fichier:extractFile(line),qte:extractQty(line),montant:extractAmount(line)};
    });
  }
  function renderClientOrderTable(cmd,sessionToken){
    var rows=rowsFromCommande(cmd);
    var docs=(cmd.documents||[]);
    var docsHtml=docs.length
      ?'<div style="margin-top:12px;"><div style="font-size:.74rem;font-weight:800;color:#666;margin-bottom:6px;">Documents disponibles</div><div style="display:flex;flex-wrap:wrap;gap:6px;">'+docs.map(function(doc){
        return '<a href="'+API+'/api/commandes/'+h(cmd.numero)+'/document/'+h(doc.id)+'?session_token='+h(sessionToken)+'" target="_blank" style="display:inline-flex;align-items:center;gap:4px;background:#f0f0ff;border:1px solid #6366f1;color:#6366f1;border-radius:6px;padding:5px 12px;font-size:.75rem;font-weight:700;text-decoration:none;">📄 '+h(doc.type||'Document')+' — '+h(doc.date||'')+'</a>';
      }).join('')+'</div></div>'
      :'<div style="margin-top:10px;font-size:.73rem;color:#aaa;font-style:italic;">Aucun document disponible pour cette commande</div>';
    if(!rows.length){
      return '<div style="margin-top:12px;background:#fff8f0;border:1px solid #f5dcc8;border-radius:10px;padding:12px;color:#999;font-size:.82rem;">Aucun détail panier.</div>'+docsHtml;
    }
    return '<div style="margin-top:12px;overflow:auto;border:1px solid #f0ebe4;border-radius:10px;">'
      +'<table style="width:100%;border-collapse:collapse;font-size:.8rem;background:#fff;">'
      +'<thead><tr style="background:#fff8f0;color:#9a3a1b;text-align:left;">'
      +'<th style="padding:9px;border-bottom:1px solid #f0ebe4;">Produit</th>'
      +'<th style="padding:9px;border-bottom:1px solid #f0ebe4;">Fichier</th>'
      +'<th style="padding:9px;border-bottom:1px solid #f0ebe4;">Qté</th>'
      +'<th style="padding:9px;border-bottom:1px solid #f0ebe4;text-align:right;">Montant TTC</th>'
      +'</tr></thead><tbody>'
      +rows.map(function(row){
        return '<tr><td style="padding:9px;border-bottom:1px solid #f0ebe4;font-weight:700;">'+h(row.produit)+'</td>'
          +'<td style="padding:9px;border-bottom:1px solid #f0ebe4;color:#666;">'+h(row.fichier)+'</td>'
          +'<td style="padding:9px;border-bottom:1px solid #f0ebe4;color:#666;">'+h(row.qte)+'</td>'
          +'<td style="padding:9px;border-bottom:1px solid #f0ebe4;text-align:right;font-weight:800;color:var(--or);">'+h(row.montant)+'</td></tr>';
      }).join('')
      +'</tbody><tfoot><tr><td colspan="3" style="padding:10px;font-weight:900;text-align:right;background:#fff8f0;">Montant TTC</td>'
      +'<td style="padding:10px;font-weight:900;text-align:right;background:#fff8f0;color:var(--or);">'+h(cmd.prix_total||'--')+'</td></tr></tfoot>'
      +'</table></div>'+docsHtml;
  }

  function showMC(id){
    ['mc-login','mc-register','mc-forgot','mc-reset','mc-dashboard','mc-suivi'].forEach(function(x){
      var el=document.getElementById(x); if(el)el.style.display=(x===id?'block':'none');
    });
  }
  function afficherMCLogin(){ showMC('mc-login'); }
  function afficherMCDash(){ showMC('mc-dashboard'); }
  function afficherMCSuivi(){ showMC('mc-suivi'); }
  function mcStatus(id,ok,msg){
    var st=document.getElementById(id); if(!st)return;
    st.style.display='block'; st.style.background=ok?'#d1fae5':'#fee2e2'; st.style.color=ok?'#065f46':'#991b1b'; st.textContent=msg;
  }
  function finishClientLogin(d){
    localStorage.setItem(SK,d.session_token);
    afficherMCDash();
    chargerMCData(d.session_token);
    toast('✅ Connexion réussie !');
  }
  window.afficherMCDash=afficherMCDash;
  window.afficherMCLogin=afficherMCLogin;

  var openReg=document.getElementById('mc-open-register');
  if(openReg)openReg.addEventListener('click',function(){showMC('mc-register');});
  var backReg=document.getElementById('mc-back-register');
  if(backReg)backReg.addEventListener('click',afficherMCLogin);
  var openForgot=document.getElementById('mc-open-forgot');
  if(openForgot)openForgot.addEventListener('click',function(){
    var emailEl=document.getElementById('mc-email'),f=document.getElementById('mc-forgot-email');
    if(emailEl&&f)f.value=emailEl.value||'';
    showMC('mc-forgot');
  });
  var backForgot=document.getElementById('mc-back-forgot');
  if(backForgot)backForgot.addEventListener('click',afficherMCLogin);

  var btnPasswordLogin=document.getElementById('mc-btn-password-login');
  if(btnPasswordLogin)btnPasswordLogin.addEventListener('click',function(){
    var email=(document.getElementById('mc-email').value||'').trim();
    var password=(document.getElementById('mc-password').value||'');
    if(!email||!email.includes('@'))return mcStatus('mc-login-status',false,'⚠️ Email invalide.');
    if(!password)return mcStatus('mc-login-status',false,'⚠️ Mot de passe requis.');
    var btn=this;btn.disabled=true;btn.textContent='Connexion...';
    fetch(API+'/api/client/password-login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:email,password:password})})
    .then(function(r){return r.json();}).then(function(d){
      btn.disabled=false;btn.textContent='Se connecter';
      if(d.success)finishClientLogin(d);
      else mcStatus('mc-login-status',false,'❌ '+(d.error||'Connexion impossible'));
    }).catch(function(){btn.disabled=false;btn.textContent='Se connecter';mcStatus('mc-login-status',false,'❌ Erreur réseau.');});
  });

  var btnRegister=document.getElementById('mc-btn-register');
  if(btnRegister)btnRegister.addEventListener('click',function(){
    var payload={
      prenom:(document.getElementById('mc-register-prenom').value||'').trim(),
      nom:(document.getElementById('mc-register-nom').value||'').trim(),
      email:(document.getElementById('mc-register-email').value||'').trim(),
      password:(document.getElementById('mc-register-password').value||''),
      password2:(document.getElementById('mc-register-password2').value||''),
      adresse:(document.getElementById('mc-register-adresse').value||'').trim(),
      cp:(document.getElementById('mc-register-cp').value||'').trim(),
      ville:(document.getElementById('mc-register-ville').value||'').trim()
    };
    if(!payload.prenom||!payload.nom||!payload.email.includes('@'))return mcStatus('mc-register-status',false,'⚠️ Prénom, nom et email sont obligatoires.');
    if(payload.password.length<8)return mcStatus('mc-register-status',false,'⚠️ Le mot de passe doit contenir au moins 8 caractères.');
    if(payload.password!==payload.password2)return mcStatus('mc-register-status',false,'⚠️ Les mots de passe ne correspondent pas.');
    var btn=this;btn.disabled=true;btn.textContent='Création...';
    fetch(API+'/api/client/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
    .then(function(r){return r.json();}).then(function(d){
      btn.disabled=false;btn.textContent='Créer mon compte sécurisé';
      if(d.success){
        mcStatus('mc-register-status',true,'✅ Compte créé. Veuillez confirmer votre compte via vos mails avant de vous connecter.');
        ['mc-register-prenom','mc-register-nom','mc-register-email','mc-register-password','mc-register-password2','mc-register-adresse','mc-register-cp','mc-register-ville'].forEach(function(id){
          var el=document.getElementById(id); if(el) el.value='';
        });
      }
      else mcStatus('mc-register-status',false,'❌ '+(d.error||'Création impossible'));
    }).catch(function(){btn.disabled=false;btn.textContent='Créer mon compte sécurisé';mcStatus('mc-register-status',false,'❌ Erreur réseau.');});
  });

  var btnForgot=document.getElementById('mc-btn-forgot');
  if(btnForgot)btnForgot.addEventListener('click',function(){
    var email=(document.getElementById('mc-forgot-email').value||'').trim();
    if(!email||!email.includes('@'))return mcStatus('mc-forgot-status',false,'⚠️ Email invalide.');
    var btn=this;btn.disabled=true;btn.textContent='Envoi...';
    fetch(API+'/api/client/forgot-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:email})})
    .then(function(r){return r.json();}).then(function(d){
      btn.disabled=false;btn.textContent='Envoyer le lien';
      mcStatus('mc-forgot-status',!!d.success,d.success?'✅ Si le compte existe, un lien sécurisé vient d’être envoyé.':'❌ '+(d.error||'Erreur'));
    }).catch(function(){btn.disabled=false;btn.textContent='Envoyer le lien';mcStatus('mc-forgot-status',false,'❌ Erreur réseau.');});
  });

  var resetToken=(new URLSearchParams(window.location.search)).get('reset_client_token');
  if(resetToken){
    var mCompte=document.getElementById('m-compte');
    if(mCompte){mCompte.classList.add('open');showMC('mc-reset');}
  }
  var btnReset=document.getElementById('mc-btn-reset-password');
  if(btnReset)btnReset.addEventListener('click',function(){
    var p1=(document.getElementById('mc-reset-password').value||''),p2=(document.getElementById('mc-reset-password2').value||'');
    if(p1.length<8)return mcStatus('mc-reset-status',false,'⚠️ Le mot de passe doit contenir au moins 8 caractères.');
    if(p1!==p2)return mcStatus('mc-reset-status',false,'⚠️ Les mots de passe ne correspondent pas.');
    var btn=this;btn.disabled=true;btn.textContent='Mise à jour...';
    fetch(API+'/api/client/reset-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:resetToken,password:p1})})
    .then(function(r){return r.json();}).then(function(d){
      btn.disabled=false;btn.textContent='Mettre à jour mon mot de passe';
      if(d.success){window.history.replaceState({},'',window.location.pathname);mcStatus('mc-reset-status',true,'✅ Mot de passe modifié.');finishClientLogin(d);}
      else mcStatus('mc-reset-status',false,'❌ '+(d.error||'Lien invalide'));
    }).catch(function(){btn.disabled=false;btn.textContent='Mettre à jour mon mot de passe';mcStatus('mc-reset-status',false,'❌ Erreur réseau.');});
  });

  // Bouton connexion
  var btnLogin=document.getElementById('mc-btn-login');
  if(btnLogin)btnLogin.addEventListener('click',function(){
    var email=(document.getElementById('mc-email').value||'').trim();
    var st=document.getElementById('mc-login-status');
    if(!email||!email.includes('@')){st.style.display='block';st.style.background='#fee2e2';st.style.color='#991b1b';st.textContent='⚠️ Email invalide.';return;}
    var btn=this;btn.disabled=true;btn.textContent='⏳ Envoi...';
    fetch(API+'/api/client/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:email})})
    .then(function(r){return r.json();}).then(function(d){
      btn.disabled=false;btn.textContent='Recevoir mon lien de connexion';st.style.display='block';
      if(d.success){st.style.background='#d1fae5';st.style.color='#065f46';st.textContent='✅ Lien envoyé ! Vérifiez votre email (valable 30 min).';}
      else{st.style.background='#fee2e2';st.style.color='#991b1b';st.textContent='❌ '+(d.error||'erreur');}
    }).catch(function(){btn.disabled=false;btn.textContent='Recevoir mon lien de connexion';});
  });

  // Suivi sans compte
  var btnSuivi=document.getElementById('mc-btn-suivi');
  if(btnSuivi)btnSuivi.addEventListener('click',function(){
    var num=(document.getElementById('mc-numero-suivi').value||'').trim().toUpperCase();
    if(!num){toast('⚠️ Entrez un numéro de commande');return;}
    this.disabled=true;this.textContent='Recherche...';var btn=this;
    fetch(API+'/api/commandes/suivi/'+num)
    .then(function(r){return r.json();}).then(function(d){
      btn.disabled=false;btn.textContent='Suivre';
      if(d.success&&d.commande){
        var cmd=d.commande;
        var SCOL={Recue:'#888','BAT envoye':'#3b82f6','BAT valide':'#8b5cf6','En production':'#f59e0b','En cours de livraison':'#06b6d4',Expediee:'#22c55e',Annulee:'#ef4444'};
        var sr=document.getElementById('mc-suivi-result');
        if(sr){sr.innerHTML='<div style="background:#f7f7f7;border-radius:12px;padding:16px;margin-bottom:12px;">'
          +'<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px;">'
          +'<strong style="font-family:\'Baloo 2\',cursive;color:var(--or);font-size:1.05rem;">'+cmd.numero+'</strong>'
          +'<span style="background:'+(SCOL[cmd.statut]||'#888')+';color:#fff;padding:4px 12px;border-radius:50px;font-size:.75rem;font-weight:700;">'+cmd.statut+'</span>'
          +'</div>'
          +'<div style="font-size:.8rem;color:#666;margin-bottom:6px;">📅 '+cmd.date+'</div>'
          +'<div style="font-size:.82rem;color:#444;margin-bottom:6px;">'+(cmd.panier||'').split('\n').slice(0,3).join('<br>')+'</div>'
          +'<div style="font-weight:700;color:var(--or);">'+cmd.prix_total+'</div>'
          +'</div>'
          +(cmd.date_livraison?'<div style="background:#fff8f0;border:1px solid #f5dcc8;border-radius:8px;padding:10px 14px;font-size:.82rem;margin-bottom:10px;">🚚 Livraison estimée : <strong>'+cmd.date_livraison+'</strong></div>':'')
          +'<p style="font-size:.78rem;color:#999;text-align:center;">Pour accéder à vos documents, connectez-vous avec votre email.</p>';}
        afficherMCSuivi();
      } else { toast('❌ Commande non trouvée : '+num); }
    }).catch(function(){btn.disabled=false;btn.textContent='Suivre';toast('❌ Erreur réseau');});
  });

  // Retour
  var btnBack=document.getElementById('mc-back-login');
  if(btnBack)btnBack.addEventListener('click',afficherMCLogin);

  // Déconnexion
  var btnDeco=document.getElementById('mc-btn-deco');
  if(btnDeco)btnDeco.addEventListener('click',function(){localStorage.removeItem(SK);afficherMCLogin();toast('Déconnecté(e).');});

  // Charger les données espace client
  window.chargerMCData=function(sessionToken){
    fetch(API+'/api/client/me',{headers:{'x-session-token':sessionToken}})
    .then(function(r){if(r.status===401){localStorage.removeItem(SK);afficherMCLogin();return null;}return r.json();})
    .then(function(data){
      if(!data||!data.success)return;
      var cl=data.client;

      // Carte fidélité - Nom & Prénom (pas email)
      var nomH=document.getElementById('mc-nom-header');if(nomH)nomH.textContent=(cl.prenom+' '+cl.nom).trim()||cl.email;
      var nomF=document.getElementById('mc-fid-nom');if(nomF)nomF.textContent=(cl.prenom+' '+cl.nom).trim()||cl.email;
      var ptsEl=document.getElementById('mc-fid-pts');if(ptsEl)ptsEl.textContent=cl.points||0;
      var pf={prenom:'mc-profile-prenom',nom:'mc-profile-nom',email:'mc-profile-email',adresse:'mc-profile-adresse',cp:'mc-profile-cp',ville:'mc-profile-ville'};
      Object.keys(pf).forEach(function(k){var el=document.getElementById(pf[k]);if(el)el.value=cl[k]||'';});

      // Barre progression fidélité
      var PALIERS=[{seuil:100,remise:5},{seuil:250,remise:15},{seuil:500,remise:35}];
      var pts=cl.points||0,palierC=null,palierS=null;
      for(var i=0;i<PALIERS.length;i++){if(pts<PALIERS[i].seuil){palierS=PALIERS[i];break;}palierC=PALIERS[i];}
      if(palierS){
        var base=palierC?palierC.seuil:0;
        var pct=Math.min(100,((pts-base)/(palierS.seuil-base))*100);
        var pb=document.getElementById('mc-fid-bar');if(pb)pb.style.width=pct+'%';
        var pl=document.getElementById('mc-fid-palier');if(pl)pl.textContent='Prochain : '+palierS.seuil+' pts = '+palierS.remise+'€';
        var pr=document.getElementById('mc-fid-reste');if(pr)pr.textContent=(palierS.seuil-pts)+' pts restants';
      } else {
        var pb2=document.getElementById('mc-fid-bar');if(pb2)pb2.style.width='100%';
        var pl2=document.getElementById('mc-fid-palier');if(pl2)pl2.textContent='🏆 Palier max atteint !';
      }

      // Codes promo
      var codes=(cl.codes_promo||[]).filter(function(p){return !p.utilise;});
      var cb=document.getElementById('mc-fid-codes');
      if(cb&&codes.length){cb.style.display='block';cb.innerHTML='<div style="font-size:.72rem;opacity:.85;margin-bottom:6px;font-weight:700;">🎁 Codes promo :</div>'+codes.map(function(p){return '<div style="background:rgba(255,255,255,.2);border-radius:8px;padding:6px 12px;margin-bottom:4px;display:flex;justify-content:space-between;"><span style="font-family:monospace;font-weight:700;">'+p.code+'</span><span>-'+p.remise+'€</span></div>';}).join('');}

      // Commandes (clic pour voir documents)
      var cmdsEl=document.getElementById('mc-cmds-list');
      var cmds=data.commandes||[];
      lastClientCommandes=cmds;
      var SCOL={Recue:'#888','BAT envoye':'#3b82f6','BAT valide':'#8b5cf6','En production':'#f59e0b','En cours de livraison':'#06b6d4',Expediee:'#22c55e',Annulee:'#ef4444'};
      cmdsEl.innerHTML=!cmds.length
        ?'<p style="color:#aaa;text-align:center;padding:20px;font-size:.83rem;">Aucune commande.</p>'
        :cmds.map(function(cmd){
          var rows=rowsFromCommande(cmd);
          return '<div class="mc-cmd-item" style="background:#fff;border:1px solid #f0ebe4;border-radius:10px;padding:12px 16px;margin-bottom:10px;cursor:pointer;transition:box-shadow .2s;" data-cmd-id="'+h(cmd.id||cmd.numero)+'">'
            +'<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;margin-bottom:4px;">'
            +'<strong style="font-family:\'Baloo 2\',cursive;color:var(--or);">'+h(cmd.numero)+'</strong>'
            +'<span style="font-size:.72rem;color:#fff;background:'+(SCOL[cmd.statut]||'#888')+';padding:3px 10px;border-radius:50px;font-weight:700;">'+h(cmd.statut)+'</span>'
            +'</div>'
            +'<div style="font-size:.78rem;color:#aaa;">'+h(cmd.date)+'</div>'
            +'<div style="font-size:.8rem;color:#555;margin-top:4px;">'+h(rows.length ? rows.map(function(r){return r.produit;}).slice(0,2).join(' · ') : 'Aucun détail panier')+'</div>'
            +'<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:6px;">'
            +'<div style="font-size:.82rem;font-weight:700;color:var(--or);">'+h(cmd.prix_total)+'</div>'
            +'<button class="mc-toggle-detail" data-cmd-detail="'+h(cmd.id||cmd.numero)+'" style="background:#111;color:#fff;border:none;border-radius:50px;padding:5px 12px;font-family:\'Baloo 2\',cursive;font-weight:800;cursor:pointer;">Voir le détail</button>'
            +'</div>'
            +'<div class="mc-cmd-detail" id="mc-detail-'+h(cmd.id||cmd.numero)+'" style="display:none;">'+renderClientOrderTable(cmd,sessionToken)+'</div>'
            +'</div>';
        }).join('');

      // Historique points
      var ptsList=document.getElementById('mc-pts-list');
      var hist=(cl.historique_points||[]).slice().reverse();
      if(ptsList)ptsList.innerHTML=!hist.length
        ?'<p style="color:#aaa;text-align:center;padding:20px;font-size:.83rem;">Aucun point pour l\'instant.</p>'
        :hist.map(function(h){return '<div style="display:flex;justify-content:space-between;background:#fff;border:1px solid #f0ebe4;border-radius:8px;padding:10px 14px;margin-bottom:6px;"><div><div style="font-size:.8rem;font-weight:700;">'+h.commande+'</div><div style="font-size:.73rem;color:#aaa;">'+h.date+'</div></div><div style="text-align:right;"><div style="font-size:.9rem;font-weight:700;color:var(--or);">+'+h.points+' pts</div><div style="font-size:.72rem;color:#aaa;">Total : '+h.total+' pts</div></div></div>';}).join('');
    }).catch(function(e){console.error('MC err:',e);});
  };

  document.querySelectorAll('.mc-card').forEach(function(card){
    card.addEventListener('click',function(){
      var panel=this.dataset.panel;
      document.querySelectorAll('.mc-card').forEach(function(c){
        c.classList.toggle('on',c===card);
        c.style.background=c===card?'#fff7ef':'#fff';
        c.style.borderColor=c===card?'#f5dcc8':'#f0ebe4';
      });
      ['commandes','fidelite','infos','chat'].forEach(function(p){
        var el=document.getElementById('mc-panel-'+p); if(el)el.style.display=(p===panel?'block':'none');
      });
    });
  });

  var cmdsListClick=document.getElementById('mc-cmds-list');
  if(cmdsListClick)cmdsListClick.addEventListener('click',function(e){
    var btn=e.target.closest('.mc-toggle-detail');
    var card=e.target.closest('.mc-cmd-item');
    if(!btn&&card)btn=card.querySelector('.mc-toggle-detail');
    if(!btn)return;
    e.preventDefault();
    e.stopPropagation();
    var id=btn.getAttribute('data-cmd-detail');
    var detail=document.getElementById('mc-detail-'+id);
    if(!detail)return;
    var open=detail.style.display==='block';
    document.querySelectorAll('.mc-cmd-detail').forEach(function(el){el.style.display='none';});
    document.querySelectorAll('.mc-toggle-detail').forEach(function(b){b.textContent='Voir le détail';});
    if(!open){
      detail.style.display='block';
      btn.textContent='Masquer le détail';
    }
  });

  var btnSaveProfile=document.getElementById('mc-btn-save-profile');
  if(btnSaveProfile)btnSaveProfile.addEventListener('click',function(){
    var token=localStorage.getItem(SK); if(!token)return afficherMCLogin();
    var payload={
      prenom:(document.getElementById('mc-profile-prenom').value||'').trim(),
      nom:(document.getElementById('mc-profile-nom').value||'').trim(),
      adresse:(document.getElementById('mc-profile-adresse').value||'').trim(),
      cp:(document.getElementById('mc-profile-cp').value||'').trim(),
      ville:(document.getElementById('mc-profile-ville').value||'').trim()
    };
    var btn=this;btn.disabled=true;btn.textContent='Enregistrement...';
    fetch(API+'/api/client/profile',{method:'POST',headers:{'Content-Type':'application/json','x-session-token':token},body:JSON.stringify(payload)})
    .then(function(r){return r.json();}).then(function(d){
      btn.disabled=false;btn.textContent='Enregistrer mes informations';
      if(d.success){mcStatus('mc-profile-status',true,'✅ Informations enregistrées.');chargerMCData(token);}
      else mcStatus('mc-profile-status',false,'❌ '+(d.error||'Erreur'));
    }).catch(function(){btn.disabled=false;btn.textContent='Enregistrer mes informations';mcStatus('mc-profile-status',false,'❌ Erreur réseau.');});
  });

  // Fermetures
  ['close-mc-login','close-mc-register','close-mc-forgot','close-mc-reset','close-mc-dash','close-mc-suivi'].forEach(function(id){
    var el=document.getElementById(id);
    if(el)el.addEventListener('click',function(){var m=document.getElementById('m-compte');if(m)m.classList.remove('open');});
  });
  var mC=document.getElementById('m-compte');
  if(mC)mC.addEventListener('click',function(e){if(e.target===this)this.classList.remove('open');});

});
})();


// ===== MODULE PRÉVISUALISATION TEXTILE =====
document.addEventListener('DOMContentLoaded', function() {

  // Quand on uploade un fichier sur un produit textile
  var mpFile = document.getElementById('mp-file');
  if (mpFile) {
    var _origChange = null;
    mpFile.addEventListener('change', function() {
      var file = this.files[0]; if (!file) return;
      var isTextile = ['tshirt','tshirt-broderie','polo','veste','chemise'].indexOf(mpPid) > -1;
      if (!isTextile) return;
      var pImg  = document.getElementById('textile-preview-img');
      var pCtrl = document.getElementById('textile-pos-controls');
      if (!pImg) return;
      var reader = new FileReader();
      reader.onload = function(e) {
        pImg.src = e.target.result;
        pImg.style.display = 'block';
        pImg.style.width   = '60px';
        pImg.style.height  = 'auto';
        // Position par défaut : poitrine gauche
        _posTextile(52, 72, 60);
        if (pCtrl) pCtrl.style.display = 'block';
      };
      reader.readAsDataURL(file);
    });
  }

  function _posTextile(left, top, size) {
    var pImg = document.getElementById('textile-preview-img'); if (!pImg) return;
    pImg.style.left   = left + 'px';
    pImg.style.top    = top  + 'px';
    pImg.style.width  = size + 'px';
    pImg.style.height = 'auto';
  }

  // Boutons de position
  document.addEventListener('click', function(e) {
    var btn = e.target.closest('.pos-btn'); if (!btn) return;
    document.querySelectorAll('.pos-btn').forEach(function(b) {
      b.style.background = '#f0f0f0'; b.style.color = '#555';
    });
    btn.style.background = '#F47B20'; btn.style.color = '#fff';
    var POS = {
      'poitrine-g': {top:72,  left:52},
      'poitrine-c': {top:72,  left:68},
      'dos-c':      {top:130, left:68},
      'manche-g':   {top:55,  left:28}
    };
    var LABELS = {
      'poitrine-g':'Poitrine gauche',
      'poitrine-c':'Poitrine centre',
      'dos-c':'Dos centre',
      'manche-g':'Manche gauche'
    };
    var pos = POS[btn.dataset.zone] || POS['poitrine-g'];
    var size = parseInt((document.getElementById('textile-size') || {value:'60'}).value) || 60;
    _posTextile(pos.left, pos.top, size);
    var pl = document.getElementById('textile-pos-label');
    if (pl) pl.textContent = LABELS[btn.dataset.zone] || btn.dataset.zone;
  });

  // Slider taille
  var slider = document.getElementById('textile-size');
  if (slider) {
    slider.addEventListener('input', function() {
      var val = document.getElementById('textile-size-val');
      if (val) val.textContent = this.value;
      var pImg = document.getElementById('textile-preview-img');
      if (pImg && pImg.style.display !== 'none') pImg.style.width = this.value + 'px';
    });
  }

  // Drag & drop sur la silhouette
  var pImg2 = document.getElementById('textile-preview-img');
  if (pImg2) {
    var dragging = false, dragOffX = 0, dragOffY = 0;
    pImg2.addEventListener('mousedown', function(e) {
      dragging = true;
      var rect = this.getBoundingClientRect();
      dragOffX = e.clientX - rect.left; dragOffY = e.clientY - rect.top;
      e.preventDefault();
    });
    document.addEventListener('mousemove', function(e) {
      if (!dragging || !pImg2) return;
      var parent = pImg2.parentElement;
      if (!parent) return;
      var pr = parent.getBoundingClientRect();
      var newLeft = e.clientX - pr.left - dragOffX;
      var newTop  = e.clientY - pr.top  - dragOffY;
      pImg2.style.left = Math.max(0, Math.min(newLeft, 136)) + 'px';
      pImg2.style.top  = Math.max(0, Math.min(newTop,  176)) + 'px';
    });
    document.addEventListener('mouseup', function() { dragging = false; });
  }

  // Bouton devis perso dans bannière comperso
  document.addEventListener('click', function(e) {
    if (!e.target.closest('#btn-devis-perso')) return;
    document.getElementById('m-produit').classList.remove('open');
    var mc = document.getElementById('m-contact'); if (mc) mc.classList.add('open');
    var sujet = document.getElementById('ct-sujet');
    if (sujet) sujet.value = 'Demande de devis';
    var ctMsg = document.getElementById('ct-msg');
    if (ctMsg && typeof mpPid !== 'undefined') ctMsg.value = 'Bonjour, je souhaite un devis pour : ' + (mpPid || '');
  });

  // ═══ MODALES LÉGALES (Mentions, CGV, FAQ) ═══
  function ouvrirModaleLegale(id) {
    var m = document.getElementById(id);
    if (m) m.classList.add('open');
  }
  document.querySelectorAll('#open-ml').forEach(function(el) {
    el.addEventListener('click', function(e) { e.preventDefault(); ouvrirModaleLegale('modal-ml'); });
  });
  document.querySelectorAll('#open-cgv').forEach(function(el) {
    el.addEventListener('click', function(e) { e.preventDefault(); ouvrirModaleLegale('modal-cgv'); });
  });
  document.querySelectorAll('#open-faq').forEach(function(el) {
    el.addEventListener('click', function(e) { e.preventDefault(); ouvrirModaleLegale('modal-faq'); });
  });
  ['modal-ml','modal-cgv','modal-faq'].forEach(function(id) {
    var m = document.getElementById(id);
    if (m) m.addEventListener('click', function(e) { if (e.target === this) this.classList.remove('open'); });
  });

});

} // fin window.__CI_LOADED__
