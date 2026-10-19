(function (root, factory) {
  const edit = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = edit;
  else root.MuseEdit = edit;
})(globalThis, function () {
  'use strict';
  const capsule = [
    'hair_casual_01', 'top_casual_01', 'top_cozy_02', 'top_preppy_03',
    'bottom_casual_01', 'bottom_cute_02', 'bottom_summer_04',
    'dress_cute_01', 'dress_elegant_02',
    'shoes_casual_01', 'shoes_cute_02', 'shoes_chic_03',
    'accessory_casual_01', 'accessory_cute_03'
  ];
  const briefs = [
    { title: 'Coffee with friends', kicker: 'THE EVERYDAY EDIT', scene: 'morning',
      story: 'A sunny table, your favorite people. Make it feel like you.',
      goals: ['A complete look', 'Comfort first', 'A little personality'],
      hints: ['Choose a dress or a top and bottom, then shoes.', 'Try sneakers or loafers for a relaxed coffee date.', 'Finish with a bow or a bag. One detail is enough.'],
      success: 'Ready for your favorite corner table.',
      next: 'Next: an evening at the gallery', focus: 'top' },
    { title: 'The gallery opening', kicker: 'THE AFTER-HOURS EDIT', scene: 'evening',
      story: 'The invitation is yours. Pick one piece that deserves the spotlight.',
      goals: ['A complete look', 'One statement piece', 'A polished finish'],
      hints: ['Choose a dress or a top and bottom, then shoes.', 'Let a dress or a pleated skirt lead the look.', 'Mary Janes or loafers give your outfit a polished finish.'],
      success: 'Your look belongs in the spotlight.',
      next: 'Next: a weekend at the market', focus: 'dress' },
    { title: 'Weekend flower market', kicker: 'THE WEEKEND EDIT', scene: 'garden',
      story: 'Fresh flowers and nowhere to rush. Style something you can wander in.',
      goals: ['A complete look', 'Room to wander', 'Bring your essentials'],
      hints: ['Choose a dress or a top and bottom, then shoes.', 'Pair sneakers or loafers with jeans, shorts or a flowing dress.', 'Choose a bag for your market finds.'],
      success: 'A fresh look for a slow weekend.',
      next: 'Explore the full wardrobe', focus: 'bottom' }
  ];
  const brief = level => briefs[level - 1] || null;
  function evaluate(level, items) {
    const b = brief(level); if (!b) return null;
    const has = category => items.some(i => i.category === category);
    const shaped = (category, shapes) => items.some(i => i.category === category && shapes.includes(i.shape));
    const complete = (has('dress') || has('top') && has('bottom')) && has('shoes');
    let decisions;
    if (level === 1) decisions = [
      shaped('shoes', ['sneaker', 'loafer']),
      has('hair') || has('accessory')
    ];
    if (level === 2) decisions = [
      has('dress') || shaped('bottom', ['pleats', 'midi', 'mamian']),
      shaped('shoes', ['maryjane', 'loafer', 'heel', 'embroidered'])
    ];
    if (level === 3) decisions = [
      shaped('shoes', ['sneaker', 'loafer']) &&
        (shaped('bottom', ['jeans', 'shorts', 'cargo', 'trousers', 'flare']) ||
         shaped('dress', ['sundress', 'aline', 'wrap', 'puff'])),
      shaped('accessory', ['bag', 'tote', 'crossbody'])
    ];
    const checks = [complete, ...decisions].map((done, i) => ({
      title: b.goals[i], hint: b.hints[i], done, points: i ? 27 : 40
    }));
    // An incomplete base outfit never passes. Style goals are visible choices,
    // not a claim that a machine can judge someone's taste.
    const score = complete ? checks.reduce((n, c) => n + (c.done ? c.points : 0), 0) : 0;
    return { score, checks, ready: complete };
  }
  function coach(outfit, done) {
    if (done) return null;
    if (!outfit.dress && !outfit.top) return { step: 1, category: 'top', text: 'Choose a top you love. A dress works too.' };
    if (!outfit.dress && !outfit.bottom) return { step: 2, category: 'bottom', text: 'Now choose a bottom to complete the outfit.' };
    if (!outfit.shoes) return { step: 3, category: 'shoes', text: 'Add a pair of shoes. Watch your whole look come together.' };
    return { step: 4, category: null, text: 'Your look is ready. Add a detail, or reveal it now.' };
  }
  return { capsule, briefs, brief, evaluate, coach };
});
