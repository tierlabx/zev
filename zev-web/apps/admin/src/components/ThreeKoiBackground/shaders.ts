// 背景顶点着色器：无形变，仅保留涟漪高度 (Z轴)
export const bgVertexShader = `
uniform float uTime;
uniform vec2 uMouse;
varying vec2 vUv;

void main() {
    vUv = uv;
    vec3 pos = position;
    
    // 仅保留微弱的鼠标涟漪Z轴高度
    float dist = distance(uv, uMouse);
    float ripple = sin(dist * 20.0 - uTime * 2.0) * exp(-dist * 5.0) * 0.1;
    pos.z += ripple;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

// 背景片段着色器：加入极其轻微的水纹折射
export const bgFragmentShader = `
uniform sampler2D uTexture;
uniform float uTime;
varying vec2 vUv;

void main() {
    vec2 uv = vUv;
    
    // 仅在X轴施加极其轻微的低频正弦波，完美模拟SVG原生的缓动波浪效果，且不拉扯Y轴
    uv.x += sin(uv.y * 5.0 + uTime * 0.8) * 0.005;

    // 获取 SVG 贴图颜色
    vec4 texColor = texture2D(uTexture, uv);
    
    // 叠加微弱的流动光感
    float light = sin(uv.x * 10.0 + uTime) * cos(uv.y * 10.0 + uTime) * 0.03;
    
    vec3 finalColor = texColor.rgb + light;
    
    gl_FragColor = vec4(finalColor, texColor.a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
`;

// 鱼的顶点着色器：平滑微弱的仿生摆尾
export const fishVertexShader = `
uniform float uTime;
uniform vec2 uMouse;
uniform vec2 uPivot;
varying vec2 vUv;

void main() {
    // 1. 计算从画布中心 (0.5, 0.5) 到鱼中心的径向方向
    vec2 radialDir = normalize(uPivot - vec2(0.5));
    
    // 2. 计算鱼游动的切线方向（即鱼的脊椎方向）
    vec2 tangentDir = vec2(-radialDir.y, radialDir.x);
    
    // 3. 计算当前像素在鱼脊椎上的位置（正值在前，负值在后）
    float alongSpine = dot(uv - uPivot, tangentDir);
    
    // 4. 产生一个平滑、低频的正弦波
    // 乘数 6.0 保证整条鱼身上最多只有一个平滑的弧形，绝不会产生锯齿折线
    // uTime * 4.0 控制摆尾的缓慢节奏
    // abs(alongSpine) * 0.012 确保中心完全不扭曲，只有距离中心最远的尾巴（和鱼嘴）有极微弱的 1.2% 摆幅
    float waveAmplitude = abs(alongSpine) * 0.012;
    float wave = sin(alongSpine * 6.0 - uTime * 4.0) * waveAmplitude;
    
    // 5. 垂直于游动方向（即径向）进行极其微弱的平滑位移
    vUv = uv + radialDir * wave;
    
    vec3 pos = position;
    
    // 鼠标涟漪Z轴高度保留
    float dist = distance(uv, uMouse);
    float ripple = sin(dist * 20.0 - uTime * 2.0) * exp(-dist * 5.0) * 0.1;
    pos.z += ripple;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

// 鱼的片段着色器：无扭曲
export const fishFragmentShader = `
uniform sampler2D uTexture;
uniform float uTime;
varying vec2 vUv;

void main() {
    vec4 texColor = texture2D(uTexture, vUv);
    
    // 仅轻微光感，无位置扭曲
    float light = sin(vUv.x * 10.0 + uTime) * cos(vUv.y * 10.0 + uTime) * 0.02;
    vec3 finalColor = texColor.rgb + light;
    
    gl_FragColor = vec4(finalColor, texColor.a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
`;
