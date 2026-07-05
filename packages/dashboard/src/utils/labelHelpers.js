export function getFormatLabel(format) {
  const map = {
    'feed_post': 'Post',
    'carousel': 'Carousel',
    'story': 'Story',
    'reel': 'Reel',
    '1:1 Feed Post': 'Post',
    '1:1 Feed Post Carousel': 'Carousel',
    '4:5 Feed Post Carousel': 'Carousel',
    '9:16 Story Post': 'Story',
    'feed_post_variant': 'Post',
    'story_variant': 'Story',
    'carousel_variant': 'Carousel',
    'reel_variant': 'Reel'
  };
  return map[format] || format || 'Post';
}
