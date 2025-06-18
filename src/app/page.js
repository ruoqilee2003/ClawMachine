"use client"
import Image from "next/image";
import { Canvas, useFrame } from "@react-three/fiber";
import { RoundedBox, CameraControls, Environment, useGLTF, ContactShadows, 
  PerspectiveCamer, axesHelper, KeyboardControls, useKeyboardControls, Box} from "@react-three/drei";
import { Suspense, useEffect, useState, useRef } from "react";
import ClawCamera from "@/component/ClawCamera";


function ClawModel({clawPos, isClawDown}){
  const clawModel = useGLTF(`claw.glb`);
  const clawRef = useRef();


  useFrame(()=>{
    if(clawRef.current){
      clawRef.current.traverse((child)=>{
        
        if(child.name == "claw"){
          child.position.set(clawPos.x, clawPos.y + 2.85, clawPos.z);
        }

        if(child.name == "clawBase"){
          child.position.set(clawPos.x, 2.85, clawPos.z);
        }

        if(child.name == "track"){
          child.position.set(0, 2.85, clawPos.z);
        }

      });
    }
  });

  return (<>
    <primitive
      ref={clawRef}
      object={clawModel.scene}
      scale={[0.6, 0.6, 0.6]}
      position={[0, 0, 0]}
      rotation={[0, 0, 0]}
    />
  </>)
  
}




export default function Home() {

  const isHidden = true;

  const [clawPos, setClawPos] = useState({x: 0, y: 0, z: 0});
  const [isClawDown, setIsClawDown] = useState(false);
  const [showPopup, setShowPopup] = useState(true);

  useEffect(() => {
    setShowPopup(true);
  }, []);

  return (
    <div className="w-full h-screen">
      {showPopup && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '2rem',
            borderRadius: '1rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            textAlign: 'center',
            color: 'black',
            border: '2px solid black'
          }}>
            <div style={{ marginBottom: '1.5rem', fontSize: '1.2rem' }}>當你看到這個視窗代表我還沒做完ㅠㅠ</div>
            <button onClick={() => setShowPopup(false)} style={{
              padding: '0.5rem 1.5rem',
              borderRadius: '0.5rem',
              border: 'none',
              background: '#333',
              color: 'white',
              fontSize: '1rem',
              cursor: 'pointer'
            }}>晚點再回來吧！</button>
          </div>
        </div>
      )}
      <KeyboardControls
        map={[
          { name: "forward", keys: ["ArrowUp", "w", "W"] },
          { name: "backward", keys: ["ArrowDown", "s", "S"] },
          { name: "left", keys: ["ArrowLeft", "a", "A"] },
          { name: "right", keys: ["ArrowRight", "d", "D"] },
          { name: "jump", keys: ["Space"] },
        ]}
      >
        <Canvas>
          <ambientLight intensity={Math.PI / 2} />
          <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} decay={0} intensity={Math.PI} />
          <pointLight position={[-10, -10, -10]} decay={0} intensity={Math.PI} />
          

          {
            !isHidden && <RoundedBox
              args={[1, 1, 1]} // Width, height, depth. Default is [1, 1, 1]
              radius={0.05} // Radius of the rounded corners. Default is 0.05
              smoothness={4} // The number of curve segments. Default is 4
              bevelSegments={4} // The number of bevel segments. Default is 4, setting it to 0 removes the bevel, as a result the texture is applied to the whole geometry.
              creaseAngle={0.4} // Smooth normals everywhere except faces that meet at an angle greater than the crease angle
            >
              <meshPhongMaterial color="#f3f3f3"/>
            </RoundedBox>
          }


          <Suspense fallback={null}>
            <ClawModel clawPos={clawPos} isClawDown={isClawDown} />
          </Suspense>


          <Environment
            background={true}
            backgroundBlurriness={0.5}
            backgroundIntensity={1}
            environmentIntensity={1}
            preset={'city'}
          /> 

          <ContactShadows opacity={1} scale={10} blur={10} far={10} resolution={256} color="#DDDDDD" />

          
          <ClawCamera clawPos={clawPos} setClawPos={setClawPos} isClawDown={isClawDown} setIsClawDown={setIsClawDown} />
          <CameraControls />
          <axesHelper args={[10]} />


        </Canvas>
      </KeyboardControls>
    </div>
  );
}
