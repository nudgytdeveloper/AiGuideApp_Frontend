import { useEffect, useRef } from "react"
import mapIcon from "@nrs/assets/img/find_map.png"
import scanIcon from "@nrs/assets/img/live_scan.png"
//libraries for the avatar and LLM components
import * as THREE from "three"
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js"
import { useSelector } from "react-redux"
import { ArrayEqual } from "@nrs/utils/common"
import { useDispatch } from "react-redux"
import { setIsListening, setIsProcessing } from "@nrs/slices/chatSlice"

// Avatarchat: includes LLM, avatar and basic body animation components
const AvatarChat = () => {
  const containerRef = useRef(null)
  const sceneRef = useRef(null)
  const cameraRef = useRef(null)
  const rendererRef = useRef(null)
  const mixerRef = useRef(null)
  const clockRef = useRef(null)
  const modelRef = useRef(null)
  const animationFrameRef = useRef(null)

  // const [isProcessing, conversationHistory] = useSelector((state) => {
  //     const chatState = state.chat
  //     return [
  //       chatState.get("isProcessing"),
  //       chatState.get("conversationHistory"),
  //     ]
  //   }, ArrayEqual),
  //   dispatch = useDispatch()

  // Filter animation to only include position and rotation tracks
  const filterAnimation = (animation) => {
    animation.tracks = animation.tracks.filter((track) => {
      const name = track.name
      return name.endsWith("Hips.position") || name.endsWith(".quaternion")
    })
    return animation
  }

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return

    // Setup renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      premultipliedAlpha: false,
    })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(
      containerRef.current.clientWidth,
      containerRef.current.clientHeight
    )
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.setClearColor(0x000000, 0)
    containerRef.current.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Setup camera - positioned to show full head and upper body
    const camera = new THREE.PerspectiveCamera(
      45, // Increased FOV slightly to fit more in frame
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      100
    )
    camera.position.set(0, 1.3, 1.0) // Moved closer from Z=1.5 to Z=1.0
    camera.lookAt(0, 1.1, 0) // Looking at upper chest/neck area to center the view
    cameraRef.current = camera

    // Setup scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xc0c0c0)
    scene.fog = new THREE.Fog(0xc0c0c0, 20, 50)
    sceneRef.current = scene

    // Setup lighting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6)
    hemiLight.position.set(0, 20, 0)
    scene.add(hemiLight)

    const dirLight = new THREE.DirectionalLight(0xffffff)
    dirLight.position.set(3, 3, 5)
    dirLight.castShadow = true
    dirLight.shadow.camera.top = 2
    dirLight.shadow.camera.bottom = -2
    dirLight.shadow.camera.left = -2
    dirLight.shadow.camera.right = 2
    dirLight.shadow.camera.near = 0.1
    dirLight.shadow.camera.far = 40
    dirLight.shadow.bias = -0.001
    dirLight.intensity = 3
    scene.add(dirLight)

    // Setup animation
    const clock = new THREE.Clock()
    clockRef.current = clock

    const animationGroup = new THREE.AnimationObjectGroup()
    const mixer = new THREE.AnimationMixer(animationGroup)
    mixerRef.current = mixer

    // Load avatar and animation
    const loader = new GLTFLoader()

    loader.load(
      "src/SCB_female.glb",
      (gltf) => {
        const model = gltf.scene
        model.position.y = -0.3 // Move the model down
        scene.add(model)
        modelRef.current = model

        animationGroup.add(model)

        model.traverse((object) => {
          if (object.isMesh) {
            object.castShadow = true
            object.receiveShadow = true
            object.material.envMapIntensity = 0.3
          }
        })

        // Load idle animation
        loader.load(
          "src/idle.glb",
          (animGltf) => {
            if (animGltf.animations && animGltf.animations.length > 0) {
              const clip = filterAnimation(animGltf.animations[0])
              const action = mixer.clipAction(clip)
              action.setLoop(THREE.LoopRepeat)
              action.play()
            }
          },
          undefined,
          (error) => console.error("Error loading animation:", error)
        )
      },
      undefined,
      (error) => {
        console.error("Error loading model:", error)
        // Create a simple cube as fallback
        const geometry = new THREE.BoxGeometry(1, 2, 0.5)
        const material = new THREE.MeshStandardMaterial({ color: 0x4caf50 })
        const cube = new THREE.Mesh(geometry, material)
        cube.position.y = 1
        scene.add(cube)
        modelRef.current = cube
      }
    )

    // Animation loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate)

      const mixerUpdateDelta = clock.getDelta()
      mixer.update(mixerUpdateDelta)

      renderer.render(scene, camera)
    }
    animate()

    // Handle window resize
    const handleResize = () => {
      if (containerRef.current) {
        camera.aspect =
          containerRef.current.clientWidth / containerRef.current.clientHeight
        camera.updateProjectionMatrix()
        renderer.setSize(
          containerRef.current.clientWidth,
          containerRef.current.clientHeight
        )
      }
    }
    window.addEventListener("resize", handleResize)

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement)
      }
      renderer.dispose()
    }
  }, [])

  return (
    <main className="main">
      {/* Three.js container */}
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: "100%",
          position: "absolute",
          top: 0,
          left: 0,
        }}
      />

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
  )
}
export default AvatarChat
