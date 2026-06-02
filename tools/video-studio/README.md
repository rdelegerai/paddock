# Studio local d'analyse vidéo

Objectif : regarder et analyser précisément les vidéos de Souvenir de Paddock, avec timecodes, scènes, OCR et transcription quand c'est utile.

## Outils installés

- FFmpeg et ffprobe : analyse technique, extraction d'images, lecture des pistes audio/vidéo.
- Python 3.12 : exécution des scripts locaux.
- PySceneDetect : détection des changements de scènes.
- Tesseract OCR : lecture automatique du texte incrusté à l'image.
- faster-whisper : transcription audio type Whisper, si la vidéo contient une voix off.

OCR veut dire : reconnaissance automatique du texte visible dans l'image.

## Analyser une vidéo

Commande de base :

```powershell
.\tools\video-studio\.venv\Scripts\python.exe .\tools\video-studio\analyze_video.py "C:\Users\rdele\Desktop\0524.mp4" --ocr
```

Résultat attendu :

- `tools/video-studio/output/0524/metadata.json`
- `tools/video-studio/output/0524/scenes.tsv`
- `tools/video-studio/output/0524/ocr.tsv`
- `tools/video-studio/output/0524/contact-sheet.jpg`
- `tools/video-studio/output/0524/review-template.md`

Pour tenter une transcription audio :

```powershell
.\tools\video-studio\.venv\Scripts\python.exe .\tools\video-studio\analyze_video.py "C:\Users\rdele\Desktop\0524.mp4" --transcribe
```

La première transcription peut télécharger un modèle Whisper dans `tools/video-studio/models`.

## Lire comme un utilisateur final

```powershell
.\tools\video-studio\.venv\Scripts\python.exe .\tools\video-studio\studio.py start "C:\Users\rdele\Desktop\0524.mp4" --analysis-dir ".\tools\video-studio\output\0524"
```

Puis ouvrir l'URL affichée, par exemple :

```text
http://127.0.0.1:8765/
```

Le lecteur permet :

- lecture normale ;
- vitesse 0.5x, 1x, 1.5x, 2x ;
- retour ou avance d'une seconde ;
- lecture de la timeline extraite ;
- clic sur un timecode pour aller directement à ce moment.

Vérifier si le lecteur tourne :

```powershell
.\tools\video-studio\.venv\Scripts\python.exe .\tools\video-studio\studio.py status
```

Arrêter le lecteur :

```powershell
.\tools\video-studio\.venv\Scripts\python.exe .\tools\video-studio\studio.py stop
```

## Méthode de revue recommandée

1. Lire la vidéo une première fois sans arrêter.
2. Relire en 1.5x pour repérer les lenteurs.
3. Relire avec la timeline pour noter les problèmes précis.
4. Comparer le texte OCR ou la transcription avec les images visibles.
5. Proposer des corrections plan par plan.
