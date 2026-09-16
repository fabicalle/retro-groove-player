import pathlib, re

files = [
    p for p in list(pathlib.Path('src/presentation').rglob('*.tsx')) + list(pathlib.Path('src/presentation').rglob('*.ts'))
    if p.name != 'fix_imports.py'
]
patterns = [
    (r'from "../store/useAudioStore"', '@/presentation/state/useAudioStore'),
    (r'from "../store/useSpotifyStore"', '@/store/useSpotifyStore'),
    (r'from "../hooks/useSpotifyPlaylists"', '@/hooks/useSpotifyPlaylists'),
    (r'from "../hooks/useSpotifyPlayer"', '@/hooks/useSpotifyPlayer'),
    (r'from "../hooks/useSpotifyAuth"', '@/presentation/hooks/useSpotifyAuth'),
    (r'from "../hooks/useAudioEngine"', '@/hooks/useAudioEngine'),
    (r'from "../components/WinampVisualizer"', '@/presentation/components/WinampVisualizer'),
    (r'from "../components/GeissVisualizer"', '@/presentation/components/GeissVisualizer'),
    (r'from "../components/WinampPlayer"', '@/presentation/components/player/WinampPlayer'),
    (r'from "../components/PS1BootSequence"', '@/presentation/components/intro/PS1BootSequence'),
    (r'from "../components/PS1Screen"', '@/presentation/components/ps1/PS1Screen'),
    (r'from "../components/PS1Container"', '@/presentation/components/ps1/PS1Container'),
    (r'from "../components/SpotifyConnect"', '@/presentation/components/player/SpotifyConnect'),
]
for f in files:
    t = f.read_text(encoding='utf-8')
    orig = t
    for pat, rep in patterns:
        t = re.sub(pat, rep, t)
    if t != orig:
        f.write_text(t, encoding='utf-8')
        print('fixed', f)