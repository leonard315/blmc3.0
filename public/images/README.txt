Place the hero image here as `hero.jpg` (recommended size ~1920x1080 or larger).

To download the Facebook photo (may fail if Facebook blocks hotlinking), run this PowerShell command in the project root:

Invoke-WebRequest -Uri "https://www.facebook.com/photo.php?fbid=2188476431395788&set=a.1439082299668542&type=3&mibextid=rS40aB7S9Ucbxw6v" -OutFile "public\images\hero.jpg"

If the downloaded file is HTML (Facebook page), open that file in a text editor — it means the direct link is not a raw image. In that case, download the image manually via a browser and save it as `public/images/hero.jpg`.
