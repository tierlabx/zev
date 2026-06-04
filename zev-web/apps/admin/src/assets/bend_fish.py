import xml.etree.ElementTree as ET
import re
import math

SVG_NS = "http://www.w3.org/2000/svg"
ET.register_namespace("", SVG_NS)

CX, CY = 1024, 571.5

def parse_d(d_str):
    return re.findall(r'[A-Za-z]|[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?', d_str)

def bend_point(x, y, t):
    dx = x - CX
    dy = y - CY
    r = math.hypot(dx, dy)
    phi = math.atan2(dy, dx)
    
    A = 35 
    phase = 2 * phi - 2 * math.pi * t
    
    # Quadratic curve makes the head rigid and tail very floppy, highly realistic
    dr = A * (r / 500.0)**2 * math.sin(phase)
    
    new_r = r + dr
    return CX + new_r * math.cos(phi), CY + new_r * math.sin(phi)

def get_frames(d_str, frames=20):
    tokens = parse_d(d_str)
    res = []
    for f in range(frames):
        t = f / frames
        out = []
        i = 0
        while i < len(tokens):
            tok = tokens[i]
            if tok.isalpha():
                out.append(tok)
                i += 1
            else:
                x, y = float(tokens[i]), float(tokens[i+1])
                nx, ny = bend_point(x, y, t)
                out.append(f"{nx:.2f} {ny:.2f}")
                i += 2
        res.append(" ".join(out))
    res.append(res[0]) 
    return "; ".join(res)

def main():
    tree = ET.parse('login-bg.svg')
    root = tree.getroot()
    
    # 1. Add <defs> for gradients and filters
    defs = ET.Element(f'{{{SVG_NS}}}defs')
    
    # White fish gradient (Silver/White)
    w_grad = ET.SubElement(defs, f'{{{SVG_NS}}}linearGradient', id='fish-white-grad', x1='0%', y1='0%', x2='100%', y2='100%')
    ET.SubElement(w_grad, f'{{{SVG_NS}}}stop', offset='0%', **{'stop-color': '#ffffff'})
    ET.SubElement(w_grad, f'{{{SVG_NS}}}stop', offset='100%', **{'stop-color': '#e2e8f0'})
    
    # Black fish gradient (Dark Blue/Black)
    b_grad = ET.SubElement(defs, f'{{{SVG_NS}}}linearGradient', id='fish-black-grad', x1='0%', y1='0%', x2='100%', y2='100%')
    ET.SubElement(b_grad, f'{{{SVG_NS}}}stop', offset='0%', **{'stop-color': '#1e293b'})
    ET.SubElement(b_grad, f'{{{SVG_NS}}}stop', offset='100%', **{'stop-color': '#0f172a'})

    # Drop shadow filter
    shadow = ET.SubElement(defs, f'{{{SVG_NS}}}filter', id='fish-shadow', x='-20%', y='-20%', width='140%', height='140%')
    ET.SubElement(shadow, f'{{{SVG_NS}}}feDropShadow', dx='0', dy='20', stdDeviation='25', **{'flood-color': '#000000', 'flood-opacity': '0.4'})

    # Insert defs at the beginning
    root.insert(0, defs)
    
    # 2. Modify fish groups
    for g in root.iter(f'{{{SVG_NS}}}g'):
        cls = g.get('class', '')
        if 'fish-1' in cls or 'fish-2' in cls:
            # Apply shadow to the whole fish
            g.set('filter', 'url(#fish-shadow)')
            
            for path in g.iter(f'{{{SVG_NS}}}path'):
                d = path.get('d')
                if not d: continue
                
                # Replace flat colors with gradients
                fill = path.get('fill')
                if fill == 'rgb(255,255,255)':
                    path.set('fill', 'url(#fish-white-grad)')
                elif fill == 'rgb(0,0,0)':
                    path.set('fill', 'url(#fish-black-grad)')
                
                # Remove existing animates
                for anim in list(path):
                    path.remove(anim)
                
                # Add morph animation
                anim_d = ET.Element(f'{{{SVG_NS}}}animate')
                anim_d.set('attributeName', 'd')
                anim_d.set('values', get_frames(d, 20))
                anim_d.set('dur', '2s')
                anim_d.set('repeatCount', 'indefinite')
                anim_d.set('calcMode', 'linear')
                path.append(anim_d)

    tree.write('login-bg.svg', encoding='utf-8', xml_declaration=True)
    print("Optimization applied: Gradients, Shadow Filter, and Quadratic Bending added.")

if __name__ == '__main__':
    main()
