from pathlib import Path
path = Path('src/App.tsx')
text = path.read_text(encoding='utf-16')
path.write_text(text, encoding='utf-8')
print('converted')
