-- Add hide_line_friendship_prompt column to users table
ALTER TABLE users 
ADD COLUMN hide_line_friendship_prompt BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN users.hide_line_friendship_prompt IS 'ユーザーがLINE友だち追加プロンプトを非表示にするかどうか';
