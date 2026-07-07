from pathlib import Path

for path in ['src/App.tsx', 'src/services/lifelineService.ts']:
    p = Path(path)
    print('---', path, '---')
    lines = p.read_text(encoding='utf-8').splitlines()
    if path == 'src/App.tsx':
        for i in range(80, 110):
            print(f'{i+1}: {lines[i]}')
    else:
        for i in range(len(lines)-60, len(lines)):
            print(f'{i+1}: {lines[i]}')
