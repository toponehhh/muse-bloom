(function (root, factory) {
  const data = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = data;
  else root.MuseData = data;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const tags = 'casual cute chic sporty elegant edgy y2k street cozy formal glam romantic vintage preppy bold minimalist boho summer winter party'.split(' ');
  const categories = ['hair', 'top', 'bottom', 'dress', 'shoes', 'accessory'];
  const categoryNames = { hair: 'Hair details', top: 'Tops', bottom: 'Bottoms', dress: 'Dresses', shoes: 'Shoes', accessory: 'Extras' };
  const chapters = [
    { name: 'Everyday Muse', short: 'Everyday', color: '#f6d6b9', note: 'Little moments. Lovely looks.' },
    { name: 'Campus Club', short: 'Campus', color: '#cadbcb', note: 'Make every entrance your own.' },
    { name: 'Find Your Vibe', short: 'Vibes', color: '#d7ccea', note: 'A different mood for every day.' },
    { name: 'Season Stories', short: 'Seasons', color: '#e9d49c', note: 'Good style, whatever the weather.' },
    { name: 'Main Character', short: 'Moments', color: '#efbdc8', note: 'A look for your big little moments.' },
    { name: 'Silk & Jade', short: 'China Haul', color: '#b9d8cb', note: 'Modern Chinese fashion, your way.' }
  ];
  const themeRows = [
    ['Casual Day','☀','casual minimalist cute','summer chic','A little sunshine. A lot of you.'],
    ['Coffee Run','☕','cozy casual chic','minimalist cute','Your usual order, an unusual amount of style.'],
    ['Study Session','✎','cozy casual preppy','cute minimalist','Soft layers and a fresh page.'],
    ['Gym Fit','⚡','sporty casual bold','summer edgy','Bring good energy to your next move.'],
    ['Rainy Day','☂','cozy casual chic','winter minimalist','A little drizzle cannot dull your sparkle.'],
    ['Sunday Brunch','🍓','cute casual chic','romantic minimalist','Something sweet for a slow Sunday.'],
    ['First Day of School','✎','preppy casual cute','chic sporty','New notebook. New favorite outfit.'],
    ['Sports Day','⚡','sporty bold casual','summer edgy','Ready, set, make a statement.'],
    ['Pep Rally','📣','sporty bold party','cute y2k','Turn up the team spirit.'],
    ['Study Date','♡','preppy cute casual','chic romantic','A chapter worth dressing up for.'],
    ['Homecoming','✧','elegant glam party','formal romantic','One night. Your kind of magic.'],
    ['Graduation','🎓','formal elegant chic','preppy minimalist','The next chapter looks good on you.'],
    ['Y2K Revival','✿','y2k cute bold','edgy party','Tiny bag. Big throwback energy.'],
    ['Clean Girl','◌','minimalist chic casual','elegant cute','Fresh, simple, beautifully you.'],
    ['Streetwear','★','street edgy bold','sporty y2k','Make the sidewalk your runway.'],
    ['Cottagecore','🌷','romantic cute casual','vintage summer','A garden daydream in full bloom.'],
    ['Dark Academia','📖','vintage preppy elegant','chic formal','Old books and a little mystery.'],
    ['Festival Queen','♫','boho bold party','y2k summer','Meet us where the music is.'],
    ['Summer Beach','🐚','summer cute casual','boho bold','Salt air and sun-kissed color.'],
    ['Winter Layers','❄','winter cozy cute','chic elegant','A warm hug, styled by you.'],
    ['Spring Picnic','🌷','romantic cute casual','summer chic','Flowers, fresh air, favorite outfit.'],
    ['Autumn Layers','🍂','cozy chic vintage','casual preppy','Golden leaves and soft textures.'],
    ['Holiday Party','✦','glam party bold','winter elegant','Bring a little extra sparkle.'],
    ["New Year's Eve",'✧','glam elegant party','bold formal','Hello, next beautiful chapter.'],
    ['First Date','♡','romantic cute chic','elegant casual','Butterflies are the best accessory.'],
    ['Job Interview','▣','formal chic minimalist','elegant preppy','Walk in wearing quiet confidence.'],
    ['Concert Night','♫','edgy bold party','street y2k','The outfit deserves an encore.'],
    ['City Girl','⌂','chic street minimalist','bold elegant','A busy day with effortless style.'],
    ['Dream Vacation','☀','boho summer casual','romantic cute','Pack a little bit of paradise.'],
    ['Red Carpet','✧','glam elegant formal','bold party','All eyes on your final flourish.'],
    ['Hanfu Day','🪷','elegant vintage romantic','chic bold','Flowing lines. A timeless new mood.'],
    ['New Chinese Style','🍵','chic minimalist elegant','vintage casual','Heritage details, everyday style.'],
    ['Silk & Jade','💚','elegant romantic chic','vintage bold','A soft shimmer and a touch of jade.'],
    ['Qipao Night','☾','glam elegant party','bold romantic','An evening in beautiful detail.'],
    ['China Haul','✿','casual cute bold','vintage chic','Your favorite finds, all in one look.'],
    ['Style Without Borders','✦','bold vintage party','elegant chic','Your final look. Your own story.']
  ];
  const themes = themeRows.map((r, i) => ({ id: r[0].toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/_$/,''), index: i + 1, chapter: Math.floor(i / 6) + 1, name: r[0], icon: r[1], required: r[2].split(' '), bonus: r[3].split(' '), description: r[4], unlockItems: [], entryItems: [] }));
  // Keep stored theme IDs stable when updating the three opening occasions.
  [
    ['Coffee with friends','☕','A sunny table, your favorite people. Make it feel like you.'],
    ['The gallery opening','✧','Pick one piece that deserves the spotlight.'],
    ['Weekend flower market','✿','Fresh flowers and nowhere to rush.']
  ].forEach(([name,icon,description],i)=>Object.assign(themes[i],{name,icon,description}));
  // name | silhouette | color | three style tags. All art is created locally.
  const rows = {
    hair: [
      'Sunday Bow|bow|#ef9bbd|casual cute minimalist',
      'Pearl Halo|pearls|#faf0d8|chic elegant formal',
      'Honey Headband|band|#e8bf72|cozy preppy vintage',
      'Sport Ribbon|ribbon|#bb97e8|sporty bold summer',
      'Rose Clips|clips|#ef82af|y2k cute party',
      'Midnight Stars|stars|#b8b5e8|edgy street bold',
      'Cocoa Flower|flower|#eab7a2|romantic boho casual',
      'Snowday Pearls|pearls|#d8e8ff|winter cozy minimalist',
      'Ribbon Pair|ribbon|#edb7d8|preppy cute romantic',
      'Platinum Stars|stars|#e2e4ef|glam edgy y2k',
      'Golden Headband|band|#efcf6c|summer elegant boho',
      'Velvet Bow|bow|#b3769e|formal vintage chic',
      'Cherry Clips|clips|#d8678f|party bold romantic',
      'Sport Headband|band|#9abfe1|sporty street casual',
      'Lilac Bow|bow|#bfa3ed|y2k winter cute',
      'Caramel Ribbon|ribbon|#e6b16d|summer sporty minimalist',
      'Velvet Pearls|pearls|#c4a9dd|glam winter elegant',
      'Starlight Halo|stars|#e8cd76|glam party boho',
      'Jade Blossom|flower|#a7d6c0|elegant vintage romantic',
      'Silk Ribbons|ribbon|#dc91af|cute chic casual',
      'Pearl Pin|clips|#f9ebd5|formal elegant minimalist',
      'Blossom Crown|flower|#f0b3bf|romantic bold party'
    ],
    top: [
      'Cloud Tee|tee|#fff5dc|casual minimalist cute',
      'Matcha Cardigan|cardigan|#9eaf91|cozy chic vintage',
      'Court Club|polo|#f5f0fa|preppy sporty casual',
      'Ribbon Blouse|blouse|#e6a5b1|romantic elegant cute',
      'Night Out Vest|vest|#484052|edgy bold party',
      'Baby Tee|tee|#c9b5df|y2k cute summer',
      'City Blazer|blazer|#a29a8c|formal chic minimalist',
      'Track Jacket|jacket|#819eb1|sporty street bold',
      'Cable Knit|sweater|#e0c99c|winter cozy casual',
      'Festival Crochet|blouse|#e7c493|boho summer romantic',
      'Satin Shirt|blouse|#a3b6ac|elegant glam formal',
      'Cherry Cardigan|cardigan|#bc6572|cute preppy winter',
      'Denim Jacket|jacket|#859dad|street casual vintage',
      'Disco Top|vest|#c6b6c6|glam party y2k',
      'Studio Hoodie|hoodie|#c3bbad|sporty cozy minimalist',
      'Midnight Blazer|blazer|#444c4c|formal edgy chic',
      'Prairie Blouse|blouse|#d7d1ad|boho romantic summer',
      'College Vest|vest|#8b8a63|preppy vintage winter',
      'Graphic Tee|tee|#d99673|bold street y2k',
      'Golden Hour Knit|sweater|#d9b35f|glam boho party',
      'Hanfu Jacket|hanfu|#c2d3bb|elegant vintage romantic',
      'Frog Button Coat|frog|#769f94|chic minimalist elegant',
      'Silk Collar Blouse|mandarin|#e8b6ad|casual cute bold'
    ],
    bottom: [
      'Everyday Denim|jeans|#8296a3|casual minimalist chic',
      'Tennis Skirt|pleats|#f0bfd3|cute sporty preppy',
      'Weekend Trousers|trousers|#c0b098|cozy vintage elegant',
      'Sunset Shorts|shorts|#cc9d81|summer boho bold',
      'Rose Midi|midi|#c98091|romantic cute chic',
      'Cargo Days|cargo|#929b83|street edgy sporty',
      'Party Pleats|pleats|#a69ac6|y2k party bold',
      'Tailored Trousers|trousers|#55565d|formal minimalist elegant',
      'Winter Plaid|pleats|#a3987e|winter preppy vintage',
      'Satin Slip Skirt|midi|#c19c72|glam romantic party',
      'Flare Jeans|flare|#7194ab|y2k casual boho',
      'Knit Midi|midi|#bcae99|winter cozy minimalist',
      'Track Pants|cargo|#7c9295|sporty street casual',
      'Linen Trousers|trousers|#e0ceb0|summer chic formal',
      'Velvet Pleats|pleats|#6b5358|glam winter elegant',
      'Garden Skirt|midi|#9fab8c|boho romantic cute',
      'Indigo Cargo|cargo|#555974|street edgy bold',
      'Moonbeam Skirt|midi|#bcb5d5|glam party y2k',
      'Jade Mamian Skirt|mamian|#86ab9a|vintage elegant romantic',
      'Brocade Mamian|mamian|#c9a880|bold vintage party',
      'Silk Wide Legs|trousers|#bdc3a9|chic casual minimalist'
    ],
    dress: [
      'Picnic Dress|sundress|#e3b5b2|cute casual summer',
      'Little Black Dress|aline|#45434b|elegant chic formal',
      'Garden Party|puff|#aebc9b|romantic cozy boho',
      'Homecoming Satin|gown|#a08cb8|glam elegant party',
      'Campus Pinafore|pinafore|#a8947d|preppy casual minimalist',
      'Tennis Club Dress|sport|#b7c8b5|sporty preppy summer',
      'Lilac Mini|aline|#c3afd6|y2k cute party',
      'City Knit Dress|knit|#b1a092|cozy chic winter',
      'Festival Flow|sundress|#cca372|boho bold summer',
      'Midnight Slip|slip|#5a5469|edgy street glam',
      'Rose Tea Dress|puff|#c59391|romantic cute vintage',
      'Winter Velvet|gown|#765e6b|winter elegant formal',
      'Sporty Shift|sport|#97a6b9|sporty street minimalist',
      'Downtown Denim|pinafore|#7d98ac|casual edgy y2k',
      'Golden Wrap|wrap|#cba96b|glam boho chic',
      'Bloom Gala Gown|gown|#c392ae|party bold romantic',
      'Modern Hanfu|hanfu|#c8d8be|elegant vintage romantic',
      'Jade Qipao|qipao|#739f90|chic elegant minimalist',
      'Moonlit Qipao|qipao|#797293|glam elegant party',
      'Peony Silk Dress|hanfu|#e0a6aa|cute bold vintage'
    ],
    shoes: [
      'Cloud Sneakers|sneaker|#e8dfce|casual sporty minimalist',
      'Petal Mary Janes|maryjane|#b77d79|cute preppy romantic',
      'City Loafers|loafer|#67594c|chic formal vintage',
      'Sunshine Sandals|sandal|#b99d6c|summer boho casual',
      'Platform Pop|platform|#b09ac1|y2k bold party',
      'Lace-up Boots|boot|#53515a|edgy street bold',
      'Satin Heels|heel|#bd9492|elegant glam formal',
      'Cozy Boots|boot|#af9271|winter cozy cute',
      'Court Sneakers|sneaker|#89a9a1|sporty preppy casual',
      'Pearl Flats|maryjane|#dfcdb9|romantic elegant minimalist',
      'Silver Platforms|platform|#acb1bf|y2k glam party',
      'Retro Runners|sneaker|#bf936f|street sporty vintage',
      'Winter Loafers|loafer|#746657|winter cozy chic',
      'Woven Sandals|sandal|#c9ae86|boho summer cute',
      'Velvet Boots|boot|#725363|edgy winter party',
      'Moonrise Heels|heel|#c2b47a|glam bold elegant',
      'Embroidered Flats|embroidered|#aac0a0|romantic vintage chic',
      'Silk Strap Heels|heel|#c4a880|elegant summer minimalist'
    ],
    accessory: [
      'Everyday Tote|tote|#c0ad83|casual minimalist cozy',
      'Pearl Necklace|necklace|#e9d7b9|elegant chic romantic',
      'Heart Bag|bag|#d6a1a7|cute party y2k',
      'Sunflower Clip|clip|#ddb66c|summer boho bold',
      'Round Glasses|glasses|#66564b|preppy vintage minimalist',
      'Street Crossbody|crossbody|#6b736a|street edgy sporty',
      'Winter Scarf|scarf|#bc8992|winter cozy cute',
      'Gold Hoops|earrings|#c2a76c|glam formal elegant',
      'Silk Bow|clip|#b49bc7|romantic preppy y2k',
      'Concert Bag|bag|#736878|party street edgy',
      'Woven Tote|tote|#c7ad80|boho summer casual',
      'City Watch|watch|#b89d72|chic formal sporty',
      'Stardust Earrings|earrings|#d1bc81|glam party bold',
      'Velvet Ribbon|scarf|#8e707c|winter vintage cozy',
      'Jade Pendant|pendant|#6e9e82|elegant romantic chic',
      'Round Silk Fan|fan|#dcd5b1|vintage cute summer',
      'Blossom Hairpin|pin|#c4a773|romantic bold elegant',
      'Brocade Clutch|bag|#a3aa88|vintage chic formal'
    ]
  };
  const counts = { hair: [4, 18, 1], top: [5, 20, 1], bottom: [4, 18, 1], dress: [3, 16, 1], shoes: [4, 16, 1], accessory: [4, 14, 2] };
  const bounds = { hair: [235, 45, 275, 390], top: [180, 330, 360, 400], bottom: [225, 590, 280, 570], dress: [185, 330, 350, 850], shoes: [240, 1080, 260, 140], accessory: [175, 150, 385, 710] };
  const items = categories.flatMap(category => rows[category].map((row, i) => {
    const [name, shape, color, tagString] = row.split('|');
    const [initial, regular, hidden] = counts[category];
    const chinese = i >= regular;
    const streak = i >= regular - hidden && i < regular;
    const id = `${category}_${chinese ? 'silk' : tagString.split(' ')[0]}_${String(i + 1).padStart(2, '0')}`;
    return { id, category, name, tags: tagString.split(' '), img: `assets/items/${id}.svg`, slotUnit: category === 'dress' ? 2 : 1, z: { hair: 60, top: 30, bottom: 20, dress: 25, shoes: 50, accessory: 70 }[category], anchor: { x: 360, y: 640 }, width: 720, height: 1280, bounds: bounds[category], shape, color, chinese, unlockType: streak ? 'streak' : 'progress', unlockLevel: i < initial ? null : 0, unlockOn: 'clear' };
  }));
  // Interleave categories so each milestone adds a useful mix.
  const ordinary = [];
  for (let n = 0; n < 23; n++) for (const c of categories) {
    const i = items.filter(x => x.category === c)[n];
    if (i && i.unlockLevel === 0 && !i.chinese && i.unlockType !== 'streak') ordinary.push(i);
  }
  for (const level of [7, 13, 19, 25]) for (let n = 0; n < 4; n++) {
    const item = ordinary.shift(); item.unlockLevel = level; item.unlockOn = 'enter';
  }
  let n = 0;
  const progressCount = ordinary.length;
  while (ordinary.length) { ordinary.shift().unlockLevel = Math.floor(n++ * 36 / progressCount) + 1; }
  const chinese = items.filter(x => x.chinese);
  // Two hair, two tops, two bottoms, two dresses, one shoe and one extra.
  const opening = { hair: 2, top: 2, bottom: 2, dress: 2, shoes: 1, accessory: 1 };
  let later = 25;
  for (const item of chinese) {
    if (opening[item.category]-- > 0) { item.unlockLevel = 31; item.unlockOn = 'enter'; }
    else item.unlockLevel = later++;
  }
  for (const theme of themes) {
    theme.unlockItems = items.filter(i => i.unlockType === 'progress' && i.unlockLevel === theme.index && i.unlockOn === 'clear').map(i => i.id);
    theme.entryItems = items.filter(i => i.unlockType === 'progress' && i.unlockLevel === theme.index && i.unlockOn === 'enter').map(i => i.id);
  }
  const capsuleNames = {
    top_cozy_02:['Rose Knit Cardigan','#c78587'], top_preppy_03:['Sky Club Polo','#a5bddb'],
    bottom_cute_02:['Ivory Pleats','#eadcc6'], bottom_summer_04:['Sage Weekend Shorts','#939e7c'],
    dress_cute_01:['Rose Satin Midi','#d9a69b'], dress_elegant_02:['Lavender Day Dress','#b6a0de'],
    shoes_chic_03:['Sage City Loafers','#87906c'], accessory_casual_01:['Caramel Top Handle','#ad703f'],
    accessory_cute_03:['Ivory Quilted Bag','#e9d8bd']
  };
  for(const item of items)if(capsuleNames[item.id]) [item.name,item.color]=capsuleNames[item.id];
  const characters = [
    {id:'bella',name:'Bella',note:'Honey bob · blue eyes',color:'#f2c8ad',asset:'assets/characters/bella.webp'},
    {id:'mika',name:'Mika',note:'Midnight bob · brown eyes',color:'#edbd9f',asset:'assets/characters/mika.webp'},
    {id:'zoe',name:'Zoe',note:'Curly puffs · hazel eyes',color:'#ad6c3d',asset:'assets/characters/zoe.webp'}
  ];
  return {tags,categories,categoryNames,chapters,themes,items,characters,counts,defaultHair:'hair_casual_01',defaultCharacter:'bella',version:1,title:'Muse Bloom'};
});
