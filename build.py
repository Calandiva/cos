# -*- coding: utf-8 -*-
"""포뮬라랩 빌드 — src/* 를 의존성 없는 단일 HTML 로 묶는다."""
import io, os

SRC = 'src'
JS = ['20-ingredients.js', '22-products.js', '24-process.js', '30-core.js',
      '40-chem.js', '45-sim.js', '50-missions.js', '60-ui.js', '80-app.js', '99-boot.js']

def rd(n):
    return io.open(os.path.join(SRC, n), encoding='utf-8').read()

def wr(path, text):
    io.open(path, 'w', encoding='utf-8', newline='\n').write(text)

js = '\n'.join(rd(n) for n in JS)
head = rd('00-head.htmlpart')
body = rd('10-body.htmlpart')

page = ('<!doctype html>\n<html lang="ko">\n<head>\n'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
        '<meta name="description" content="화장품 제조 시뮬레이터. 원료를 골라 처방을 짜고 공정을 돌려 점도·pH·탁도·색상과 배치 규모별 오차까지 계산한다.">\n'
        '<meta name="color-scheme" content="light dark">\n'
        '<meta name="theme-color" content="#A8436B">\n'
        + head +
        '\n</head>\n<body>\n' + body + '\n<script>\n' + js + '\n</script>\n</body>\n</html>\n')

wr('index.html', page)
wr('formulab.bundle.js', js)
wr('.nojekyll', '')
wr('vercel.json', '{\n  "cleanUrls": true,\n  "trailingSlash": false\n}\n')

kb = lambda s: len(s.encode('utf-8')) / 1024.0
print('index.html   %7.1f KB  (GitHub Pages / Vercel / file:// 로컬 실행)' % kb(page))
print('bundle js    %7.1f KB' % kb(js))
