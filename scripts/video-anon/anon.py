import cv2, sys, subprocess, numpy as np, json
src, dst = sys.argv[1], sys.argv[2]
debug = len(sys.argv) > 3 and sys.argv[3] == 'debug'
CROP = {'brasao-maria': (54,192,612,1088), 'rodrigao': (36,128,648,1152), 'telao-casa': (36,128,648,1152)}
crop = next((v for k,v in CROP.items() if k in src), None)
cap = cv2.VideoCapture(src)
W, H = int(cap.get(3)), int(cap.get(4)); fps = cap.get(5)
det = cv2.FaceDetectorYN.create('yunet.onnx', '', (W, H), 0.45, 0.3, 5000)
frames=[]
while True:
    ok, f = cap.read()
    if not ok: break
    frames.append(f)
n=len(frames)
# 1) detecção por frame (também no espelho horizontal p/ ajudar perfis)
dets=[]
for f in frames:
    _, fc = det.detect(f)
    b=[]
    if fc is not None:
        for r in fc:
            x,y,w,h = r[:4]
            minw = 80 if 'telao' in src else 50
            if w<minw: continue
            if 'rodrigao' in src and y>900: continue
            b.append([x,y,w,h])
    dets.append(b)
# 2) tracks simples com ponte de lacunas (interpola em faltas até 12 frames)
tracks=[]  # cada track: dict frame-> box
for i,b in enumerate(dets):
    for bx in b:
        cx,cy = bx[0]+bx[2]/2, bx[1]+bx[3]/2
        best=None;bd=1e9
        for t in tracks:
            lf = max(t)
            if i-lf>24: continue
            lb=t[lf]; d=np.hypot(cx-(lb[0]+lb[2]/2), cy-(lb[1]+lb[3]/2))
            if d<max(120,lb[2]*1.8) and d<bd: best=t;bd=d
        if best is None: tracks.append({i:bx})
        else: best[i]=bx
per=[[] for _ in range(n)]
for t in tracks:
    if len(t)<8: continue
    ks=sorted(t)
    for a,bk in zip(ks,ks[1:]+[None]):
        pass
    for i in range(min(ks)-10, max(ks)+11):
        if i<0 or i>=n: continue
        if i in t: bx=np.array(t[i],float)
        else:
            lo=[k for k in ks if k<i]; hi=[k for k in ks if k>i]
            if lo and hi:
                a,b2=lo[-1],hi[0]; u=(i-a)/(b2-a); bx=np.array(t[a])*(1-u)+np.array(t[b2])*u
            else:
                k=lo[-1] if lo else hi[0]; bx=np.array(t[k],float)
        per[i].append(bx)
# suaviza temporalmente: não implementado (segura por ponte), expande caixa
def blur_region(f, x0,y0,x1,y1, k):
    x0=max(0,int(x0));y0=max(0,int(y0));x1=min(W,int(x1));y1=min(H,int(y1))
    if x1-x0<4 or y1-y0<4: return
    roi=f[y0:y1,x0:x1]
    small=cv2.resize(roi,(max(2,(x1-x0)//k),max(2,(y1-y0)//k)),interpolation=cv2.INTER_AREA)
    pix=cv2.resize(small,(x1-x0,y1-y0),interpolation=cv2.INTER_LINEAR)
    pix=cv2.GaussianBlur(pix,(0,0),k/2)
    m=np.zeros((y1-y0,x1-x0),np.float32)
    cv2.ellipse(m,((x1-x0)//2,(y1-y0)//2),((x1-x0)//2,(y1-y0)//2),0,0,360,1,-1) if k>0 else None
    m=cv2.GaussianBlur(m,(0,0),max(3,(x1-x0)/14))[...,None]
    f[y0:y1,x0:x1]=(pix*m+roi*(1-m)).astype(np.uint8)
def blur_rect(f,x0,y0,x1,y1,k):
    x0=max(0,int(x0));y0=max(0,int(y0));x1=min(W,int(x1));y1=min(H,int(y1))
    if x1-x0<4 or y1-y0<4: return
    roi=f[y0:y1,x0:x1]
    small=cv2.resize(roi,(max(2,(x1-x0)//k),max(2,(y1-y0)//k)),interpolation=cv2.INTER_AREA)
    pix=cv2.resize(small,(x1-x0,y1-y0),interpolation=cv2.INTER_LINEAR)
    pix=cv2.GaussianBlur(pix,(0,0),k/2)
    m=np.ones((y1-y0,x1-x0),np.float32)
    m=cv2.GaussianBlur(np.pad(m[6:-6,6:-6],6),(0,0),5)[...,None] if min(m.shape)>16 else m[...,None]
    f[y0:y1,x0:x1]=(pix*m+roi*(1-m)).astype(np.uint8)
out=[]
for i,f in enumerate(frames):
    g=f.copy()
    for bx in per[i]:
        x,y,w,h=bx
        cx,cy=x+w/2,y+h/2
        # rosto (cabeça inteira: caixa ampliada)
        blur_region(g, cx-w*0.95, cy-h*1.05, cx+w*0.95, cy+h*0.95, 18)
        # tórax/crachá: faixa abaixo do queixo
        blur_rect(g, cx-w*0.85, cy+h*0.85, cx+w*0.85, cy+h*3.1, 16)
    if debug:
        for bx in per[i]:
            cv2.rectangle(g,(int(bx[0]),int(bx[1])),(int(bx[0]+bx[2]),int(bx[1]+bx[3])),(0,255,0),2)
    if crop and not debug:
        cx0,cy0,cw,ch=crop; g=cv2.resize(g[cy0:cy0+ch,cx0:cx0+cw],(W,H),interpolation=cv2.INTER_CUBIC)
    out.append(g)
if debug:
    idx=[0,int(n*.2),int(n*.4),int(n*.6),int(n*.8),n-1]
    cv2.imwrite(dst, cv2.hconcat([cv2.resize(out[j],(360,640)) for j in idx]))
else:
    p=subprocess.Popen(['ffmpeg','-v','error','-y','-f','rawvideo','-pix_fmt','bgr24','-s',f'{W}x{H}','-r',str(fps),'-i','-','-an','-c:v','libx264','-preset','slow','-crf','26','-pix_fmt','yuv420p','-movflags','+faststart',dst],stdin=subprocess.PIPE)
    for g in out: p.stdin.write(g.tobytes())
    p.stdin.close(); p.wait()
print(src, n, 'frames; caixas por frame (média):', sum(len(x) for x in per)/n)
