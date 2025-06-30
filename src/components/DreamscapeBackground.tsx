import React, { useRef, useEffect } from 'react';

interface DreamscapeBackgroundProps {
  className?: string;
}

export const DreamscapeBackground: React.FC<DreamscapeBackgroundProps> = ({ className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
      console.warn('WebGL not supported, falling back to canvas 2D');
      return;
    }

    // Vertex shader source
    const vertexShaderSource = `
      attribute vec2 a_position;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    // Enhanced fragment shader with more vibrant colors and better contrast
    const fragmentShaderSource = `
      precision mediump float;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform vec2 u_mouse;
      
      // Noise function for organic patterns
      float noise(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
      }
      
      // Smooth noise
      float smoothNoise(vec2 st) {
        vec2 i = floor(st);
        vec2 f = fract(st);
        
        float a = noise(i);
        float b = noise(i + vec2(1.0, 0.0));
        float c = noise(i + vec2(0.0, 1.0));
        float d = noise(i + vec2(1.0, 1.0));
        
        vec2 u = f * f * (3.0 - 2.0 * f);
        
        return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
      }
      
      // Fractal noise
      float fractalNoise(vec2 st) {
        float value = 0.0;
        float amplitude = 0.5;
        float frequency = 0.0;
        
        for (int i = 0; i < 5; i++) {
          value += amplitude * smoothNoise(st);
          st *= 2.0;
          amplitude *= 0.5;
        }
        return value;
      }
      
      // Enhanced color palette with more vibrant colors
      vec3 palette(float t) {
        // More vibrant color palette for better visibility
        vec3 a = vec3(0.2, 0.5, 0.8);
        vec3 b = vec3(0.8, 0.5, 0.2);
        vec3 c = vec3(2.0, 1.0, 1.0);
        vec3 d = vec3(0.0, 0.33, 0.67);
        
        return a + b * cos(6.28318 * (c * t + d));
      }
      
      void main() {
        vec2 st = gl_FragCoord.xy / u_resolution.xy;
        st.x *= u_resolution.x / u_resolution.y;
        
        // Create flowing, organic patterns
        vec2 pos = st * 2.5;
        
        // Add time-based movement with more dynamic motion
        pos += vec2(sin(u_time * 0.15), cos(u_time * 0.12)) * 0.8;
        
        // Enhanced mouse interaction
        vec2 mousePos = u_mouse;
        mousePos.x *= u_resolution.x / u_resolution.y;
        float mouseDist = distance(st * vec2(u_resolution.x / u_resolution.y, 1.0), mousePos);
        float mouseInfluence = smoothstep(0.4, 0.0, mouseDist);
        
        // Create stronger ripple effect
        float ripple = sin(mouseDist * 25.0 - u_time * 3.0) * mouseInfluence * 0.2;
        pos += ripple;
        
        // Generate base noise pattern with more layers
        float n1 = fractalNoise(pos + u_time * 0.08);
        float n2 = fractalNoise(pos * 1.8 + u_time * 0.05);
        float n3 = fractalNoise(pos * 0.3 + u_time * 0.1);
        
        // Combine noise layers with better contrast
        float finalNoise = n1 * 0.6 + n2 * 0.3 + n3 * 0.1;
        
        // Add stronger mouse interaction to color
        finalNoise += mouseInfluence * 0.5;
        
        // Generate more vibrant colors
        vec3 color1 = palette(finalNoise + u_time * 0.15);
        vec3 color2 = palette(finalNoise + 0.5 + u_time * 0.12);
        
        // Mix colors with more dynamic blending
        float mixFactor = smoothNoise(st * 3.0 + u_time * 0.03);
        vec3 finalColor = mix(color1, color2, mixFactor);
        
        // Enhanced gradient overlay for better depth
        float gradient = 1.0 - length(st - 0.5) * 0.6;
        finalColor *= gradient;
        
        // Stronger color enhancement around mouse cursor
        finalColor = mix(finalColor, finalColor * 2.0, mouseInfluence * 0.7);
        
        // Add some brightness boost for better visibility
        finalColor *= 1.5;
        
        // Subtle vignette effect
        float vignette = smoothstep(0.9, 0.3, length(st - 0.5));
        finalColor *= vignette;
        
        // Higher alpha for much better visibility against black background
        gl_FragColor = vec4(finalColor, 0.8);
      }
    `;

    // Compile shader
    function compileShader(gl: WebGLRenderingContext, source: string, type: number): WebGLShader | null {
      const shader = gl.createShader(type);
      if (!shader) return null;
      
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      
      return shader;
    }

    // Create shader program
    const vertexShader = compileShader(gl, vertexShaderSource, gl.VERTEX_SHADER);
    const fragmentShader = compileShader(gl, fragmentShaderSource, gl.FRAGMENT_SHADER);
    
    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    if (!program) return;

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program linking error:', gl.getProgramInfoLog(program));
      return;
    }

    // Set up geometry (full screen quad)
    const positions = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
       1,  1,
    ]);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    // Get uniform locations
    const timeLocation = gl.getUniformLocation(program, 'u_time');
    const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
    const mouseLocation = gl.getUniformLocation(program, 'u_mouse');
    const positionLocation = gl.getAttribLocation(program, 'a_position');

    // Resize canvas to match display size
    function resizeCanvas() {
      const displayWidth = canvas.clientWidth;
      const displayHeight = canvas.clientHeight;

      if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        gl.viewport(0, 0, displayWidth, displayHeight);
      }
    }

    // Mouse move handler
    function handleMouseMove(event: MouseEvent) {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: (event.clientX - rect.left) / rect.width,
        y: 1.0 - (event.clientY - rect.top) / rect.height, // Flip Y coordinate
      };
    }

    // Animation loop
    function animate() {
      resizeCanvas();
      
      timeRef.current += 0.016; // Roughly 60fps
      
      gl.useProgram(program);
      
      // Set uniforms
      gl.uniform1f(timeLocation, timeRef.current);
      gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
      gl.uniform2f(mouseLocation, mouseRef.current.x, mouseRef.current.y);
      
      // Set up vertex attributes
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
      
      // Enable blending for transparency
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      
      // Clear and draw
      gl.clearColor(0.0, 0.0, 0.0, 0.0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      
      animationRef.current = requestAnimationFrame(animate);
    }

    // Start animation
    canvas.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    animate();

    // Cleanup
    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      gl.deleteBuffer(positionBuffer);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
      style={{ zIndex: 1 }}
    />
  );
};