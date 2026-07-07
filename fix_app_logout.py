from pathlib import Path

path = Path('src/App.tsx')
text = path.read_text(encoding='utf-8')
old = "  const handleLogout = () => {\n    signOutDonor();\n    setState(prev => ({ ...prev, currentUser: null }));\n  };\n"
new = "  const handleLogout = async () => {\n    await signOutDonor();\n    setState(prev => ({ ...prev, currentUser: null }));\n  };\n"
if old in text:
    path.write_text(text.replace(old, new), encoding='utf-8')
    print('patched')
else:
    # Try CRLF
    old_crlf = old.replace('\n', '\r\n')
    new_crlf = new.replace('\n', '\r\n')
    if old_crlf in text:
        path.write_text(text.replace(old_crlf, new_crlf), encoding='utf-8')
        print('patched_crlf')
    else:
        print('not found')
        # show snippet around the relevant line
        idx = text.find('signOutDonor();')
        if idx != -1:
            start = max(0, idx-100)
            end = min(len(text), idx+100)
            print(repr(text[start:end]))
