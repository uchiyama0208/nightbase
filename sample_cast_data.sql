-- Insert 10 sample cast profiles for testing
-- Note: user_id is set to NULL as these are guest profiles for tablet timecard
INSERT INTO public.profiles (
  id,
  user_id,
  store_id,
  role,
  display_name,
  display_name_kana,
  real_name,
  real_name_kana
) VALUES
  (gen_random_uuid(), NULL, 'f76c0bfe-df7b-4577-a7ef-5f13a915941d', 'cast', 'あいり', 'あいり', '佐藤 愛理', 'さとう あいり'),
  (gen_random_uuid(), NULL, 'f76c0bfe-df7b-4577-a7ef-5f13a915941d', 'cast', 'かなこ', 'かなこ', '田中 香奈子', 'たなか かなこ'),
  (gen_random_uuid(), NULL, 'f76c0bfe-df7b-4577-a7ef-5f13a915941d', 'cast', 'さくら', 'さくら', '鈴木 桜', 'すずき さくら'),
  (gen_random_uuid(), NULL, 'f76c0bfe-df7b-4577-a7ef-5f13a915941d', 'cast', 'なつみ', 'なつみ', '高橋 夏美', 'たかはし なつみ'),
  (gen_random_uuid(), NULL, 'f76c0bfe-df7b-4577-a7ef-5f13a915941d', 'cast', 'はるか', 'はるか', '伊藤 遥', 'いとう はるか'),
  (gen_random_uuid(), NULL, 'f76c0bfe-df7b-4577-a7ef-5f13a915941d', 'cast', 'まりな', 'まりな', '渡辺 麻里奈', 'わたなべ まりな'),
  (gen_random_uuid(), NULL, 'f76c0bfe-df7b-4577-a7ef-5f13a915941d', 'cast', 'ゆい', 'ゆい', '山本 結衣', 'やまもと ゆい'),
  (gen_random_uuid(), NULL, 'f76c0bfe-df7b-4577-a7ef-5f13a915941d', 'cast', 'りな', 'りな', '中村 里奈', 'なかむら りな'),
  (gen_random_uuid(), NULL, 'f76c0bfe-df7b-4577-a7ef-5f13a915941d', 'cast', 'えみ', 'えみ', '小林 恵美', 'こばやし えみ'),
  (gen_random_uuid(), NULL, 'f76c0bfe-df7b-4577-a7ef-5f13a915941d', 'cast', 'みお', 'みお', '加藤 美緒', 'かとう みお');
