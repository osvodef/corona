git checkout .
git clean -fd
git checkout master
git pull
npm ci
npm run data
git add .
git commit -m "data update"
git push
npm run build
git co gh-pages
cp -r dist/* .
git add .
git commit -m "release"
git push
git co master
