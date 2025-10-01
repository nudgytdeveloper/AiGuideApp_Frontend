import { useEffect, useState, useRef } from "react"
import bellIcon from "./assets/img/bell.png"
import settingsIcon from "./assets/img/settings.png"
import mapIcon from "./assets/img/find_map.png"
import scanIcon from "./assets/img/live_scan.png"
import micIcon from "./assets/img/mic.png"
import "./App.css"

//libraries for the avatar and LLM components 
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Basic Conversation History component 
const MAX_HISTORY_LENGTH = 20;
const CONVERSATION_TIMEOUT = 300000; // 5 minutes

// Avatarchat: includes LLM, avatar and basic body animation components 
function AvatarChat() {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const mixerRef = useRef(null);
  const clockRef = useRef(null);
  const modelRef = useRef(null);
  const animationFrameRef = useRef(null);
  const recognitionRef = useRef(null);
  
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([
    {
      role: 'system',
      content: 'You are the AI Assistant for a Singaporean company called Nudgyt. You are nice and friendly.'
    }
  ]);
  const [lastInteractionTime, setLastInteractionTime] = useState(Date.now());

  // Filter animation to only include position and rotation tracks
  const filterAnimation = (animation) => {
    animation.tracks = animation.tracks.filter((track) => {
      const name = track.name;
      return name.endsWith("Hips.position") || name.endsWith(".quaternion");
    });
    return animation;
  };

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;

    // Setup renderer
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true,
      premultipliedAlpha: false
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 0);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Setup camera - positioned to show full head and upper body
    const camera = new THREE.PerspectiveCamera(
      45, // Increased FOV slightly to fit more in frame
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 1.3, 1.0); // Moved closer from Z=1.5 to Z=1.0
    camera.lookAt(0, 1.1, 0); // Looking at upper chest/neck area to center the view
    cameraRef.current = camera;

    // Setup scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xc0c0c0);
    scene.fog = new THREE.Fog(0xc0c0c0, 20, 50);
    sceneRef.current = scene;

    // Setup lighting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff);
    dirLight.position.set(3, 3, 5);
    dirLight.castShadow = true;
    dirLight.shadow.camera.top = 2;
    dirLight.shadow.camera.bottom = -2;
    dirLight.shadow.camera.left = -2;
    dirLight.shadow.camera.right = 2;
    dirLight.shadow.camera.near = 0.1;
    dirLight.shadow.camera.far = 40;
    dirLight.shadow.bias = -0.001;
    dirLight.intensity = 3;
    scene.add(dirLight);

    // Setup animation
    const clock = new THREE.Clock();
    clockRef.current = clock;
    
    const animationGroup = new THREE.AnimationObjectGroup();
    const mixer = new THREE.AnimationMixer(animationGroup);
    mixerRef.current = mixer;

    // Load avatar and animation
    const loader = new GLTFLoader();
    
    loader.load(
      'src/SCB_female.glb',
      (gltf) => {
        const model = gltf.scene;
        model.position.y = -0.3; // Move the model down
        scene.add(model);
        modelRef.current = model;
        
        animationGroup.add(model);

        model.traverse((object) => {
          if (object.isMesh) {
            object.castShadow = true;
            object.receiveShadow = true;
            object.material.envMapIntensity = 0.3;
          }
        });

        // Load idle animation
        loader.load(
          'src/idle.glb',
          (animGltf) => {
            if (animGltf.animations && animGltf.animations.length > 0) {
              const clip = filterAnimation(animGltf.animations[0]);
              const action = mixer.clipAction(clip);
              action.setLoop(THREE.LoopRepeat);
              action.play();
            }
          },
          undefined,
          (error) => console.error('Error loading animation:', error)
        );
      },
      undefined,
      (error) => {
        console.error('Error loading model:', error);
        // Create a simple cube as fallback
        const geometry = new THREE.BoxGeometry(1, 2, 0.5);
        const material = new THREE.MeshStandardMaterial({ color: 0x4CAF50 });
        const cube = new THREE.Mesh(geometry, material);
        cube.position.y = 1;
        scene.add(cube);
        modelRef.current = cube;
      }
    );

    // Animation loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      
      const mixerUpdateDelta = clock.getDelta();
      mixer.update(mixerUpdateDelta);
      
      renderer.render(scene, camera);
    };
    animate();

    // Handle window resize
    const handleResize = () => {
      if (containerRef.current) {
        camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
      }
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Initialize Speech Recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      
      recognition.onstart = () => {
        setIsListening(true);
      };
      
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        addToConversationHistory('user', transcript);
      };
      
      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };
      
      recognitionRef.current = recognition;
    } else {
      console.warn('Speech recognition not supported in this browser');
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  // Add message to conversation history
  const addToConversationHistory = (role, content) => {
    const currentTime = Date.now();
    
    // Check if conversation has timed out
    if (currentTime - lastInteractionTime > CONVERSATION_TIMEOUT) {
      resetConversationHistory();
    }
    
    setLastInteractionTime(currentTime);
    
    setConversationHistory(prev => {
      const newHistory = [...prev, { role, content, timestamp: currentTime }];
      
      // Keep conversation history manageable
      if (newHistory.length > MAX_HISTORY_LENGTH + 1) {
        return [newHistory[0], ...newHistory.slice(-MAX_HISTORY_LENGTH)];
      }
      
      return newHistory;
    });
    
    if (role === 'user') {
      processWithLLM(content);
    }
  };

  // Reset conversation history
  const resetConversationHistory = () => {
    setConversationHistory([
      {
        role: 'system',
        content: 'You are the AI Assistant for a Singaporean company called Nudgyt. You are nice and friendly.'
      }
    ]);
  };

  // Process with LLM
  const processWithLLM = async (userMessage) => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    
    try {
      const messages = conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      messages.push({ role: 'user', content: userMessage });
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer '
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: messages,
          max_tokens: 150,
          temperature: 0.7,
          presence_penalty: 0.1,
          frequency_penalty: 0.1
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.choices[0].message.content;
      
      setConversationHistory(prev => [...prev, { 
        role: 'assistant', 
        content: aiResponse,
        timestamp: Date.now()
      }]);
      
      speakResponse(aiResponse);
      
    } catch (error) {
      console.error('Error calling LLM:', error);
      
      const fallbackResponse = "I'm sorry, I'm having trouble connecting to my AI service right now. Can you try again?";
      setConversationHistory(prev => [...prev, { 
        role: 'assistant', 
        content: fallbackResponse,
        timestamp: Date.now()
      }]);
      speakResponse(fallbackResponse);
    } finally {
      setIsProcessing(false);
    }
  };

  // Text to speech
  const speakResponse = (text) => {
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 0.8;
    utterance.lang = 'en-US';
    
    const voices = window.speechSynthesis.getVoices();
    const englishVoices = voices.filter(voice => 
      voice.lang.startsWith('en-') || voice.lang === 'en'
    );
    
    const preferredVoice = englishVoices.find(voice => 
      voice.name.includes('Samantha') || 
      voice.name.includes('Karen') ||
      voice.name.toLowerCase().includes('female')
    );
    
    if (preferredVoice || englishVoices[0]) {
      utterance.voice = preferredVoice || englishVoices[0];
    }
    
    window.speechSynthesis.speak(utterance);
  };

  // Start listening - triggered by mic button
  const startListening = () => {
    if (recognitionRef.current && !isListening && !isProcessing) {
      recognitionRef.current.start();
    }
  };

  // Handle text input submission
  const handleTextSubmit = () => {
    const input = document.getElementById('chatbox');
    const text = input.value.trim();
    if (text) {
      addToConversationHistory('user', text);
      input.value = '';
    }
  };

  // Handle Enter key in text input
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleTextSubmit();
    }
  };

  return (
    <div className="app-container">
      <header className="header">
        <span className="logo">AI Guide</span>
        <div className="header-icons">
          <img className="icon" src={bellIcon} alt="Notification" />
          <img className="icon" src={settingsIcon} alt="Settings" />
        </div>
      </header>
      
      <main className="main">
        {/* Three.js container */}
        <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }} />
        
        {/* Keep existing floating elements */}
        <div className="video-preview">
          <img src="" alt="" />
        </div>
        <div className="action-buttons">
          <button className="action-btn">
            <img src={mapIcon} height={80} width={80} alt="Map" />
          </button>
          <button className="action-btn">
            <img src={scanIcon} height={80} width={80} alt="Scan" />
          </button>
        </div>
      </main>
      
      <footer className="chat-box">
        <input 
          id="chatbox" 
          name="chatbox" 
          type="text" 
          placeholder="Type your message..." 
          onKeyPress={handleKeyPress}
          disabled={isProcessing}
        />
        <button 
          className={`mic-btn ${isListening ? 'listening' : ''} ${isProcessing ? 'processing' : ''}`}
          onClick={startListening} 
          disabled={isListening || isProcessing}
        >
          <img src={micIcon} alt="Mic" />
        </button>
      </footer>
    </div>
  );
}

//Previous Function before Editing 

function getSessionFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("session") || "";
}

// Main App component - this is what gets exported
export default function App() {
  const [sessionId, setSessionId] = useState(getSessionFromUrl());
  
  // get session from url
  useEffect(() => {
    const onPopState = () => setSessionId(getSessionFromUrl());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [])

  let invalidSessionNode = (
    <div className="container">
      <header className="header">
        <h1>Ai Guide App</h1>
        <p>Getting <code>session</code> from hologram</p>
      </header>

      <main className="card">
        <div className="row">
          <span className="label">session_id:</span>
          <span className="value" data-testid="session-id">
            {sessionId || "(empty)"}
          </span>
        </div>
        <p className="hint">
          Try visiting <code>?session=session_id</code> at the end of the URL
        </p>
      </main>
    </div>
  );
  
  let mainNode = <AvatarChat />;
  
  // TODO: to add checking session id's validility
  return sessionId ? mainNode : invalidSessionNode;
}