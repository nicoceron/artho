#!/usr/bin/env python3
"""Recover small authored vector icons as data for native Astro components."""
import json
from pathlib import Path
from lxml import html

root = Path(__file__).resolve().parent.parent
labels = {
    'Why Choose Us', 'Key Features', 'Get Started Today', 'How It Works',
    'What Our Users Say', 'Start Smarter, Manage Better', 'Who We Are',
    'Our Journey', 'Our Team', 'Real-Time Financial Overview',
    'Automated Billing & Payments', 'Insightful Analytics', 'Budget Planning',
    'Seamless Integrations', 'Add-Ons', 'Frequently Asked Questions',
}
icons = {}
ui_icons = {}
def vector(svg):
    return {'viewBox': svg.get('viewbox', '0 0 256 256'), 'paths': [p.get('d') for p in svg.xpath('.//path[@d]')]}

for route in ['home', 'about', 'features', 'pricing']:
    evidence = json.loads((root / f'.evidence/routes/{route}.json').read_text())
    tree = html.fromstring(evidence['cleanDom'])
    if route == 'features':
        paragraph = tree.xpath('//*[not(*) and normalize-space()="Recurring Invoices"]')[0]
        for ancestor in paragraph.iterancestors():
            vectors = ancestor.xpath('.//svg')
            if vectors:
                ui_icons['check'] = vector(vectors[0])
                break
    if route == 'pricing':
        for key, text in {'analytics': 'Advanced Analytics', 'currency': 'Multi-Currency Support', 'shield': 'Enhanced Security & Compliance', 'team': 'Additional Team Members', 'integrations': 'Premium Integrations Pack'}.items():
            paragraph = tree.xpath('//*[not(*) and normalize-space()=$text]', text=text)[0]
            for ancestor in paragraph.iterancestors():
                vectors = ancestor.xpath('.//svg')
                if vectors:
                    ui_icons[key] = vector(vectors[0])
                    break
    if route == 'home':
        desktop = next(c for c in evidence['captures'] if c['viewport']['name'] == 'desktop')
        nodes = desktop['nodes']
        rating = next(n for n in nodes if n.get('attributes', {}).get('data-framer-name') == 'Rating')
        descendants = {rating['id']}
        for n in nodes:
            if n.get('parentId') in descendants:
                descendants.add(n['id'])
        svg = next(n for n in nodes if n['id'] in descendants and n['tag'] == 'svg')
        svg_ids = {svg['id']}
        for n in nodes:
            if n.get('parentId') in svg_ids:
                svg_ids.add(n['id'])
        ui_icons['star'] = {'viewBox': svg['attributes']['viewBox'], 'paths': [n['attributes']['d'] for n in nodes if n['id'] in svg_ids and n['tag'] == 'path']}
        for anchor in tree.xpath('//footer//a'):
            href = anchor.get('href', '')
            if href in ['https://linkedin.com', 'https://instagram.com', 'https://x.com', 'https://youtube.com']:
                ui_icons[href.split('//')[1].split('.')[0]] = vector(anchor.xpath('.//svg')[0])
        for key, text in {'user': 'Your Name', 'email': 'your@email.com', 'lock': '••••••••••', 'card': '3388 4556 8860 8899', 'calendar': 'Expired Date', 'info': 'CV/CVV', 'star':'4.7'}.items():
            matches = tree.xpath('//*[not(*) and normalize-space()=$text]', text=text)
            if not matches:
                continue
            for ancestor in matches[-1].iterancestors():
                vectors = ancestor.xpath('.//svg')
                if vectors:
                    ui_icons[key] = vector(vectors[0])
                    break
    for paragraph in tree.xpath('//p'):
        label = ''.join(paragraph.itertext()).strip()
        if label not in labels or label in icons:
            continue
        for ancestor in paragraph.iterancestors():
            vectors = ancestor.xpath('.//svg')
            if vectors:
                svg = vectors[0]
                icons[label] = vector(svg)
                break
assert labels == icons.keys(), labels - icons.keys()
(root / 'src/data/badge-icons.json').write_text(json.dumps(icons, indent=2) + '\n')
(root / 'src/data/ui-icons.json').write_text(json.dumps(ui_icons, indent=2) + '\n')
print(f'Extracted {len(icons)} source badge icons')
