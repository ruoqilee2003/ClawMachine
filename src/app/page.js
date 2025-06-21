"use client"
import Image from "next/image";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { RoundedBox, CameraControls, Environment, useGLTF, ContactShadows, PerspectiveCamera, 
  axesHelper, KeyboardControls, useKeyboardControls, Box, useTexture} from "@react-three/drei";
import { Suspense, useEffect, useRef, useState } from "react";
import { Vector3 } from "three";
import gsap from 'gsap';
import Swal from 'sweetalert2'
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, get, child } from "firebase/database";

// Firebase 配置
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig, "claw-game");
const database = getDatabase(app);

// 獲取台灣時間
function getTaiwanTime() {
  const now = new Date();
  const taiwanTime = new Date(now.getTime() + (8 * 60 * 60 * 1000)); // UTC+8
  return taiwanTime.toISOString();
}

// 驗證帳號格式
function validateUsername(username) {
  const regex = /^[a-zA-Z0-9._]+$/;
  return regex.test(username) && username.length <= 20;
}

// 密碼加密函數
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function ClawModel({clawPos, isLowering, hasPrize, isClawUp, isCoinFlying}) {
  const clawModel = useGLTF(`claw.glb`);
  const clawModelRef = useRef();

  useEffect(() => {
    if (clawModelRef.current) {
      clawModelRef.current.traverse((child) => {
        if (child.name === 'Sphere041') {
          child.visible = !isCoinFlying && (!isLowering || isClawUp); // 丟硬幣時隱藏，下爪時隱藏（除非正在上升）
        }
      });
    }
  }, [hasPrize, isClawUp, isLowering, isCoinFlying]);

  useFrame((state) => {
    if (clawModelRef.current) {
      clawModelRef.current.traverse((child) => {
        if (child.name === 'claw') {
          child.position.set(clawPos.x, clawPos.y, clawPos.z);
        }

        if(isLowering) return;

        if (child.name === 'clawBase') {
          child.position.set(clawPos.x, clawPos.y+0.15, clawPos.z);
        }

        if (child.name === 'track') {
          child.position.set(0.011943, clawPos.y+0.15, clawPos.z);
        }
      });
    }
  })
  
  return (
    <primitive
      ref={clawModelRef}
      object={clawModel.scene}
      scale={[0.6, 0.6, 0.6]}
      position={[0, 0, 0]}
      rotation={[0, 0, 0]}
    />
  );
}

// UI錢幣組件 - 用於分數顯示
function UICoinModel({ onClick }) {
  const coinModel = useGLTF(`coin.glb`);
  const coinRef = useRef();

  const handleClick = () => {
    onClick && onClick(); // 直接执行点击回调，不再有旋转动画
  };

  return (
    <primitive
      ref={coinRef}
      object={coinModel.scene.clone()}
      scale={[2.0, 2.0, 2.0]}
      position={[0, 0, 0]}
      rotation={[Math.PI * 0.5, 0, 0]} // 直立的錢幣
      onClick={handleClick}
      style={{ cursor: 'pointer' }}
    />
  );
}

// 錢幣3D模型組件
function CoinModel({ position, rotation = [0, 0, 0], scale = [0.3, 0.3, 0.3] }) {
  const coinModel = useGLTF(`coin.glb`);
  const coinRef = useRef();

  // 添加旋轉動畫
  useFrame((state) => {
    if (coinRef.current) {
      coinRef.current.rotation.y += 0.02;
    }
  });

  // 調試信息
  useEffect(() => {
    if (coinModel) {
      console.log('Coin model loaded:', coinModel);
      console.log('Coin position:', position);
    }
  }, [coinModel, position]);

  return (
    <primitive
      ref={coinRef}
      object={coinModel.scene.clone()}
      scale={scale}
      position={position}
      rotation={rotation}
    />
  );
}

// 飞行錢幣組件
function FlyingCoin({ isFlying, onComplete }) {
  const coinRef = useRef();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isFlying) {
      setIsVisible(true);
      
      // 等待組件渲染完成再執行動畫
      setTimeout(() => {
        if (coinRef.current) {
          // 使用GSAP创建飞行动画
          const tl = gsap.timeline({
            onComplete: () => {
              setIsVisible(false);
              onComplete();
            }
          });
          
          // 设置初始位置（夹娃娃机前方更低的位置）
          coinRef.current.position.set(0, 1.0, 1);
          coinRef.current.rotation.set(0, 0, 0);
          
          // 调整后的拋物线：从更低开始，最高点保持不变
          tl.to(coinRef.current.position, { 
            y: 2.8,          // 最高點保持不變
            z: 0.8,          // 稍微往前但不到中心
            duration: 1.5, 
            ease: "power2.out" 
          })
          .to(coinRef.current.rotation, { 
            x: Math.PI * 2, 
            y: Math.PI * 4, 
            z: Math.PI, 
            duration: 3, 
            ease: "none" 
          }, 0)
          .to(coinRef.current.position, { 
            y: 1.0,          // 回到起始高度
            z: 0.5,          // 結束位置還是在前方
            duration: 1.5, 
            ease: "power2.in" 
          }, 1.5);
        } else {
          onComplete();
        }
      }, 100);
    }
  }, [isFlying, onComplete]);

  if (!isVisible) return null;

  return (
    <primitive
      ref={coinRef}
      object={useGLTF(`coin.glb`).scene.clone()}
      scale={[0.8, 0.8, 0.8]}
      position={[0, 1.0, 1]}
    />
  );
}

function Camera({setClawPos, boxRef, clawPos, isLowering, setIsLowering, hasPrize, setHasPrize, isClawUp, setIsClawUp, updateCoins, coins, isCoinFlying, setIsCoinFlying}) {
  const cameraRef = useRef();
  
  useFrame(() => {
    if (cameraRef.current) {
      cameraRef.current.lookAt(0, 1.5, 0);
    }
  });

  const [, getKeys] = useKeyboardControls();

  useFrame((state) => {
    const { forward, backward, left, right, jump } = getKeys();
    const speed = 0.02;
    const limitX = 0.4;
    const limitZ = 0.25;
    
    if (boxRef.current) {
      if(!isLowering && !isCoinFlying && coins > 0){
        if (forward) {
          setClawPos({x: clawPos.x, y: clawPos.y, z: clawPos.z - speed});
        }
        if (backward) {
          setClawPos({x: clawPos.x, y: clawPos.y, z: clawPos.z + speed});
        }
        if (left) {
          setClawPos({x: clawPos.x - speed, y: clawPos.y, z: clawPos.z});
        }
        if (right) {
          setClawPos({x: clawPos.x + speed, y: clawPos.y, z: clawPos.z});
        }
  
        if (clawPos.x > limitX) {
          setClawPos({x: limitX, y: clawPos.y, z: clawPos.z});
        }
        if (clawPos.x < -limitX) {
          setClawPos({x: -limitX, y: clawPos.y, z: clawPos.z});
        }
        if (clawPos.z > limitZ) {
          setClawPos({x: clawPos.x, y: clawPos.y, z: limitZ});
        }
        if (clawPos.z < -limitZ) {
          setClawPos({x: clawPos.x, y: clawPos.y, z: -limitZ});
        }

        if(jump){
          // 先扣除1錢幣
          const newCoins = coins - 1;
          updateCoins(newCoins);
          
          // 启动coin飞行动画
          setIsCoinFlying(true);
        }
      } else if (coins === 0 && !isLowering && !isCoinFlying) {
        if (jump) {
          Swal.fire({
            html: `
              <div style="text-align: center; margin-bottom: 2rem;">
                <div style="display: inline-block; font-size: 3.5rem; font-weight: 900; color: white; -webkit-text-stroke: 5px transparent; background: linear-gradient(to right, #E6A3D6, #85BCE5); -webkit-background-clip: text; background-clip: text; font-family: 'Arial Black', Gadget, sans-serif; position: relative;">Claw Machine</div>
              </div>
              <div style="background: white; padding: 2.5rem; border-radius: 30px; box-shadow: 0 3px 12px rgba(0, 0, 0, 0.12), 0 1px 6px rgba(0, 0, 0, 0.08); color: #3e3e3e; width: 420px; margin: 0 auto;">
                <div style="text-align: center; font-size: 1.2rem; line-height: 1.6;">
                  <h3 style="margin: 0 0 1rem 0; font-size: 1.5rem; font-weight: bold; color: #85BCE5;">錢幣不足</h3>
                  <p style="margin: 0.5rem 0; color: #666;">需要至少 1 個錢幣才能遊戲</p>
                  <p style="margin: 0.5rem 0; color: #666;">重新登入可獲得新的錢幣</p>
                </div>
              </div>
            `,
            background: 'rgba(255, 255, 255, 0.8)',
            customClass: {
                popup: 'custom-swal-popup',
                confirmButton: 'custom-swal-button-cancel',
                actions: 'custom-swal-actions',
                htmlContainer: 'custom-swal-html-container'
            },
            confirmButtonText: '確定',
            backdrop: true,
            buttonsStyling: false,
            focusConfirm: false,
          });
        }
      }
    }
  })

  return (
    <PerspectiveCamera
      ref={cameraRef}
      makeDefault
      position={[0, 3, 4]}
    />
  );
}

function BackgroundImage() {
  const { scene } = useThree();
  scene.background = null;
  return null;
}

export default function Home() {
  const boxRef = useRef();
  const axesRef = useRef();
  const isHidden = true;

  const [clawPos, setClawPos] = useState({x: -0.4, y: 2.7, z: 0.2});
  const [isLowering, setIsLowering] = useState(false);
  const [hasPrize, setHasPrize] = useState(false);
  const [isClawUp, setIsClawUp] = useState(false);
  
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [coins, setCoins] = useState(10);
  const [isMuted, setIsMuted] = useState(false);
  const [isCoinFlying, setIsCoinFlying] = useState(false);
  const [bgMusic, setBgMusic] = useState(null);

  // coin飞行完成后执行夹爪动作的函数
  const handleCoinFlyComplete = () => {
    setIsCoinFlying(false);
    setHasPrize(false);
    setIsClawUp(false);
    setIsLowering(true);
          
          // 四種結果的概率系統
          const random = Math.random();
          let result, reward, message;
          
          if (random < 0.3) {
            result = "失敗";
            reward = 0;
            message = "很可惜，沒有獲得任何獎勵";
          } else if (random < 0.6) {
            result = "回本";
            reward = 1;
            message = "收支平衡，再接再厲";
          } else if (random < 0.85) {
            result = "小賺";
            reward = 2;
            message = "貪財貪財～";
          } else {
            result = "大獎";
            reward = 5;
            message = "阿罵我出運啦！";
          }
          
          setHasPrize(reward > 0);
          
           gsap.timeline().to(clawPos, { y: 2, duration: 2})
            .to(clawPos, { y: 2.7, duration: 3, onStart: () => {
              setIsClawUp(true); // 开始上升时设置
            }})
            .then(() => {
              setIsLowering(false);
              
        const finalCoins = coins + reward;
              updateCoins(finalCoins);
              
              // 根據結果類型設定顏色：成功類型用蔚藍色，失敗類型用粉色
                  const resultColor = result === "失敗-1" ? "#E6A3D6" : "#85BCE5";
              
              Swal.fire({
                html: `
                  <div style="text-align: center; margin-bottom: 2rem;">
              <div style="display: inline-block; font-size: 3.5rem; font-weight: 900; color: white; -webkit-text-stroke: 5px transparent; background: linear-gradient(to right, #E6A3D6, #85BCE5); -webkit-background-clip: text; background-clip: text; font-family: 'Arial Black', Gadget, sans-serif; position: relative;">Claw Machine</div>
                  </div>
                  <div style="background: white; padding: 2.5rem; border-radius: 30px; box-shadow: 0 3px 12px rgba(0, 0, 0, 0.12), 0 1px 6px rgba(0, 0, 0, 0.08); color: #3e3e3e; width: 420px; margin: 0 auto;">
                    <div style="text-align: center; font-size: 1.2rem; line-height: 1.6;">
                <h3 style="margin: 0 0 1rem 0; font-size: 1.8rem; font-weight: bold; color: ${resultColor};">
                        ${result}${reward > 0 ? ` +${reward}` : ''}
                      </h3>
                      <p style="margin: 0.5rem 0; color: #666;">${message}</p>
                      <p style="margin: 0.5rem 0; color: #666;">剩餘錢幣：${finalCoins}</p>
                      ${finalCoins === 0 ? '<p style="margin: 0.5rem 0; color: #666;">重新登入可獲得新的錢幣</p>' : ''}
                    </div>
                  </div>
                `,
                background: 'rgba(255, 255, 255, 0.8)',
                customClass: {
                    popup: 'custom-swal-popup',
                    confirmButton: 'custom-swal-button-cancel',
                    actions: 'custom-swal-actions',
                    htmlContainer: 'custom-swal-html-container'
                },
                confirmButtonText: '確定',
                backdrop: true,
                buttonsStyling: false,
                focusConfirm: false,
              });
            });
  };

  // 初始化背景音乐
  useEffect(() => {
    const initBgMusic = () => {
      const audio = new Audio('/bg-music.mp3');
      audio.loop = true;
      audio.volume = 0.3; // 设置音量为30%
      setBgMusic(audio);
      
      // 立即嘗試播放音樂
      if (!isMuted) {
        setTimeout(() => {
          audio.play().catch(e => {
            console.log('自動播放失敗，將在用戶交互時播放:', e);
            
            // 如果自動播放失敗，在用戶第一次點擊時播放
            const handleFirstClick = () => {
              if (!isMuted) {
                audio.play().catch(err => console.log('音樂播放失敗:', err));
              }
              document.removeEventListener('click', handleFirstClick);
            };
            document.addEventListener('click', handleFirstClick);
          });
        }, 500);
      }
    };
    
    initBgMusic();
  }, []);

  // 处理静音状态变化
  useEffect(() => {
    if (bgMusic) {
      if (isMuted) {
        bgMusic.pause();
      } else {
        // 不管是否登入都播放音樂
        bgMusic.play().catch(e => {
          console.log('音乐播放失败:', e);
        });
      }
    }
  }, [isMuted, bgMusic]);

  // 顯示遊戲說明的函數
  const showGameInstructions = () => {
    Swal.fire({
      html: `
        <div style="text-align: center; margin-bottom: 2rem;">
          <div style="display: inline-block; font-size: 3.5rem; font-weight: 900; color: white; -webkit-text-stroke: 5px transparent; background: linear-gradient(to right, #E6A3D6, #85BCE5); -webkit-background-clip: text; background-clip: text; font-family: 'Arial Black', Gadget, sans-serif; position: relative;">Claw Machine</div>
        </div>
        <div style="background: white; padding: 2.5rem; border-radius: 30px; box-shadow: 0 3px 12px rgba(0, 0, 0, 0.12), 0 1px 6px rgba(0, 0, 0, 0.08); color: #3e3e3e; width: 420px; margin: 0 auto;">
          <div style="text-align: left; font-size: 1.1rem; line-height: 1.8;">
              <p style="margin: 0.5rem 0; color: #666;">． <b>WASD</b> 或 <b>方向鍵</b>：移動夾爪</p>
              <p style="margin: 0.5rem 0; color: #666;">． <b>空白鍵</b>：開始夾取</p>
              <p style="margin: 0.5rem 0; color: #666;">． 每次遊戲消耗<b>1個錢幣</b>，共4種結果</p>
              <p style="margin: 0.5rem 0; color: #666;">． 快來試試手氣吧！</p>
          </div>
        </div>
      `,
      background: 'transparent',
      customClass: {
          popup: 'custom-swal-popup',
          confirmButton: 'custom-swal-button-cancel',
          actions: 'custom-swal-actions',
          htmlContainer: 'custom-swal-html-container'
      },
      confirmButtonText: '下一步',
      showCancelButton: false,
      allowOutsideClick: false,
      backdrop: false,
      buttonsStyling: false,
      focusConfirm: false,
    }).then(() => {
      showLoginDialog();
    });
  };

  useEffect(() => {
    showGameInstructions();
  }, []);

  const showLoginDialog = () => {
    Swal.fire({
      html: `
        <div style="text-align: center; margin-bottom: 2rem;">
          <div style="display: inline-block; font-size: 3.5rem; font-weight: 900; color: white; -webkit-text-stroke: 5px transparent; background: linear-gradient(to right, #E6A3D6, #85BCE5); -webkit-background-clip: text; background-clip: text; font-family: 'Arial Black', Gadget, sans-serif; position: relative;">Claw Machine</div>
        </div>
        <div style="background: white; padding: 2.5rem; border-radius: 30px; box-shadow: 0 3px 12px rgba(0, 0, 0, 0.12), 0 1px 6px rgba(0, 0, 0, 0.08); color: #3e3e3e; width: 420px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 1.5rem;">
            <h3 style="margin: 0 0 1rem 0; font-size: 1.3rem; font-weight: bold; color: #85BCE5;">登入帳號</h3>
          </div>
          <input id="swal-username" placeholder="帳號" style="width: 100%; padding: 12px 16px; margin-bottom: 16px; border: 2px solid #e5e5e5; border-radius: 12px; font-size: 1rem; box-sizing: border-box; outline: none; transition: border-color 0.2s ease;" onfocus="this.style.borderColor='#85BCE5'" onblur="this.style.borderColor='#e5e5e5'">
          <input id="swal-password" type="password" placeholder="密碼" style="width: 100%; padding: 12px 16px; margin-bottom: 16px; border: 2px solid #e5e5e5; border-radius: 12px; font-size: 1rem; box-sizing: border-box; outline: none; transition: border-color 0.2s ease;" onfocus="this.style.borderColor='#85BCE5'" onblur="this.style.borderColor='#e5e5e5'">
          <div style="font-size: 0.85rem; color: #666; text-align: center; line-height: 1.4;">
            帳號格式：只能包含英文、數字、.、_，最多20個字元
          </div>
        </div>
      `,
      background: 'transparent',
      customClass: {
          popup: 'custom-swal-popup',
          confirmButton: 'custom-swal-button',
          cancelButton: 'custom-swal-button-cancel',
          actions: 'custom-swal-actions',
          htmlContainer: 'custom-swal-html-container'
      },
      showCancelButton: true,
      confirmButtonText: '上一步',
      cancelButtonText: '登入',
      backdrop: false,
      buttonsStyling: false,
      focusConfirm: false,
      focusCancel: false,
    }).then((result) => {
      if (result.isDismissed && result.dismiss === 'cancel') {
        const username = document.getElementById('swal-username').value.trim().toLowerCase();
        const password = document.getElementById('swal-password').value;
        
        if (!username || !password) {
          Swal.fire({
            html: `<div style="text-align: center; margin-bottom: 2rem;"><div style="display: inline-block; font-size: 3.5rem; font-weight: 900; color: white; -webkit-text-stroke: 5px transparent; background: linear-gradient(to right, #E6A3D6, #85BCE5); -webkit-background-clip: text; background-clip: text; font-family: 'Arial Black', Gadget, sans-serif; position: relative;">Claw Machine</div></div><div style="background: white; padding: 2.5rem; border-radius: 30px; box-shadow: 0 3px 12px rgba(0, 0, 0, 0.12), 0 1px 6px rgba(0, 0, 0, 0.08); color: #3e3e3e; width: 420px; margin: 0 auto;"><div style="text-align: center; font-size: 1.2rem; line-height: 1.6;"><h3 style="margin: 0 0 1rem 0; font-size: 1.5rem; font-weight: bold; color: #E6A3D6;">輸入錯誤</h3><p style="margin: 0.5rem 0; color: #666;">請輸入帳號和密碼</p></div></div>`,
            background: 'transparent',
            customClass: { popup: 'custom-swal-popup', confirmButton: 'custom-swal-button-cancel', actions: 'custom-swal-actions', htmlContainer: 'custom-swal-html-container' },
            confirmButtonText: '確定',
            backdrop: false,
            buttonsStyling: false,
          }).then(() => { showLoginDialog(); });
          return;
        }
        
        if (!validateUsername(username)) {
          Swal.fire({
            html: `<div style="text-align: center; margin-bottom: 2rem;"><div style="display: inline-block; font-size: 3.5rem; font-weight: 900; color: white; -webkit-text-stroke: 5px transparent; background: linear-gradient(to right, #E6A3D6, #85BCE5); -webkit-background-clip: text; background-clip: text; font-family: 'Arial Black', Gadget, sans-serif; position: relative;">Claw Machine</div></div><div style="background: white; padding: 2.5rem; border-radius: 30px; box-shadow: 0 3px 12px rgba(0, 0, 0, 0.12), 0 1px 6px rgba(0, 0, 0, 0.08); color: #3e3e3e; width: 420px; margin: 0 auto;"><div style="text-align: center; font-size: 1.2rem; line-height: 1.6;"><h3 style="margin: 0 0 1rem 0; font-size: 1.5rem; font-weight: bold; color: #E6A3D6;">輸入錯誤</h3><p style="margin: 0.5rem 0; color: #666;">帳號格式不正確</p></div></div>`,
            background: 'transparent',
            customClass: { popup: 'custom-swal-popup', confirmButton: 'custom-swal-button-cancel', actions: 'custom-swal-actions', htmlContainer: 'custom-swal-html-container' },
            confirmButtonText: '確定',
            backdrop: false,
            buttonsStyling: false,
          }).then(() => { showLoginDialog(); });
          return;
        }
        
        handleLogin(username, password);
      } else if (result.isConfirmed) {
        setTimeout(() => { window.location.reload(); }, 100);
      }
    });
  };

  const handleLogin = async (username, password) => {
    try {
      const userRef = ref(database, `users/${username}`);
      const snapshot = await get(userRef);
      
      if (snapshot.exists()) {
        const userData = snapshot.val();
        const hashedPassword = await hashPassword(password);
        if (userData.password === hashedPassword) {
          setCurrentUser({
            username: username,
            password: userData.password,
            coins: userData.coins || 10,
            createdAt: userData.createdAt,
            updatedAt: userData.updatedAt
          });
          setCoins(userData.coins || 10);
          setIsLoggedIn(true);
          
          Swal.fire({
            html: `<div style="text-align: center; margin-bottom: 2rem;"><div style="display: inline-block; font-size: 3.5rem; font-weight: 900; color: white; -webkit-text-stroke: 5px transparent; background: linear-gradient(to right, #E6A3D6, #85BCE5); -webkit-background-clip: text; background-clip: text; font-family: 'Arial Black', Gadget, sans-serif; position: relative;">Claw Machine</div></div><div style="background: white; padding: 2.5rem; border-radius: 30px; box-shadow: 0 3px 12px rgba(0, 0, 0, 0.12), 0 1px 6px rgba(0, 0, 0, 0.08); color: #3e3e3e; width: 420px; margin: 0 auto;"><div style="text-align: center; font-size: 1.2rem; line-height: 1.6;"><h3 style="margin: 0 0 1rem 0; font-size: 1.5rem; font-weight: bold; color: #85BCE5;">登入成功</h3><p style="margin: 0.5rem 0; color: #666;">歡迎回來，${username}</p><p style="margin: 0.5rem 0; color: #666;">當前錢幣：${userData.coins || 10}</p></div></div>`,
            background: 'rgba(255, 255, 255, 0.8)',
            customClass: { popup: 'custom-swal-popup', confirmButton: 'custom-swal-button-cancel', actions: 'custom-swal-actions', htmlContainer: 'custom-swal-html-container' },
            confirmButtonText: '開始遊戲',
            backdrop: true,
            buttonsStyling: false,
            focusConfirm: false,
          });
        } else {
          Swal.fire({
            html: `<div style="text-align: center; margin-bottom: 2rem;"><div style="display: inline-block; font-size: 3.5rem; font-weight: 900; color: white; -webkit-text-stroke: 5px transparent; background: linear-gradient(to right, #E6A3D6, #85BCE5); -webkit-background-clip: text; background-clip: text; font-family: 'Arial Black', Gadget, sans-serif; position: relative;">Claw Machine</div></div><div style="background: white; padding: 2.5rem; border-radius: 30px; box-shadow: 0 3px 12px rgba(0, 0, 0, 0.12), 0 1px 6px rgba(0, 0, 0, 0.08); color: #3e3e3e; width: 420px; margin: 0 auto;"><div style="text-align: center; font-size: 1.2rem; line-height: 1.6;"><h3 style="margin: 0 0 1rem 0; font-size: 1.5rem; font-weight: bold; color: #E6A3D6;">登入失敗</h3><p style="margin: 0.5rem 0; color: #666;">密碼錯誤</p></div></div>`,
            background: 'transparent',
            customClass: { popup: 'custom-swal-popup', confirmButton: 'custom-swal-button-cancel', actions: 'custom-swal-actions', htmlContainer: 'custom-swal-html-container' },
            confirmButtonText: '重試',
            backdrop: false,
            buttonsStyling: false,
            focusConfirm: false,
          }).then(() => { showLoginDialog(); });
        }
      } else {
        const hashedPassword = await hashPassword(password);
        const currentTime = getTaiwanTime();
        const newUserData = {
          username: username,
          password: hashedPassword,
          coins: 10,
          createdAt: currentTime,
          updatedAt: currentTime
        };
        
        await set(userRef, newUserData);
        
        setCurrentUser(newUserData);
        setCoins(10);
        setIsLoggedIn(true);
        
        Swal.fire({
          html: `<div style="text-align: center; margin-bottom: 2rem;"><div style="display: inline-block; font-size: 3.5rem; font-weight: 900; color: white; -webkit-text-stroke: 5px transparent; background: linear-gradient(to right, #E6A3D6, #85BCE5); -webkit-background-clip: text; background-clip: text; font-family: 'Arial Black', Gadget, sans-serif; position: relative;">Claw Machine</div></div><div style="background: white; padding: 2.5rem; border-radius: 30px; box-shadow: 0 3px 12px rgba(0, 0, 0, 0.12), 0 1px 6px rgba(0, 0, 0, 0.08); color: #3e3e3e; width: 420px; margin: 0 auto;"><div style="text-align: center; font-size: 1.2rem; line-height: 1.6;"><h3 style="margin: 0 0 1rem 0; font-size: 1.5rem; font-weight: bold; color: #85BCE5;">註冊成功</h3><p style="margin: 0.5rem 0; color: #666;">歡迎新玩家 ${username}</p><p style="margin: 0.5rem 0; color: #666;">你獲得了 10 錢幣</p></div></div>`,
          background: 'transparent',
          customClass: { popup: 'custom-swal-popup', confirmButton: 'custom-swal-button-cancel', actions: 'custom-swal-actions', htmlContainer: 'custom-swal-html-container' },
          confirmButtonText: '開始遊戲',
          backdrop: false,
          buttonsStyling: false,
          focusConfirm: false,
        });
      }
    } catch (error) {
      console.error('登入錯誤:', error);
    }
  };

  const updateCoins = async (newCoins) => {
    if (!currentUser) return;
    
    try {
      const updatedUserData = {
        username: currentUser.username,
        password: currentUser.password,
        coins: newCoins,
        createdAt: currentUser.createdAt,
        updatedAt: getTaiwanTime()
      };
      
      const userRef = ref(database, `users/${currentUser.username}`);
      await set(userRef, updatedUserData);
      
      setCurrentUser(updatedUserData);
      setCoins(newCoins);
    } catch (error) {
      console.error('更新錢幣錯誤:', error);
    }
  };

  const handleLogout = () => {
    // 登出時停止背景音樂
    if (bgMusic) {
      bgMusic.pause();
      bgMusic.currentTime = 0;
    }
    
    setIsLoggedIn(false);
    setCurrentUser(null);
    setCoins(10);
    setClawPos({x: -0.4, y: 2.7, z: 0.2});
    setHasPrize(false);
    setIsClawUp(false);
    setIsLowering(false);
    window.location.reload();
  };

  // 獲取排行榜數據
  const getLeaderboard = async () => {
    try {
      const usersRef = ref(database, 'users');
      const snapshot = await get(usersRef);
      
      if (snapshot.exists()) {
        const users = snapshot.val();
        const userArray = Object.values(users).map(user => ({
          username: user.username,
          coins: user.coins || 0
        }));
        
        // 按錢幣排序，取前三名
        const topThree = userArray
          .sort((a, b) => b.coins - a.coins)
          .slice(0, 3);
        
        return topThree;
      }
      return [];
    } catch (error) {
      console.error('獲取排行榜錯誤:', error);
      return [];
    }
  };

  // 顯示排行榜彈窗
  const showLeaderboard = async () => {
    const leaderboard = await getLeaderboard();
    
    let leaderboardHTML = '';
    if (leaderboard.length === 0) {
      leaderboardHTML = '<p style="text-align: center; color: #666;">暫無排行榜數據</p>';
    } else {
      leaderboard.forEach((user, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
        leaderboardHTML += `
          <div style="
            display: flex; 
            align-items: center; 
            justify-content: space-between; 
            padding: 0.75rem; 
            margin: 0.5rem 0;
            background: ${index === 0 ? '#fff8e1' : index === 1 ? '#f3f4f6' : '#fef7f0'};
            border-radius: 12px;
            border-left: 4px solid ${index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : '#cd7f32'};
          ">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <span style="font-size: 1rem; color: #666;">${medal}</span>
              <span style="font-weight: bold; color: #3e3e3e;">${user.username}</span>
            </div>
            <span style="font-weight: bold; color: #666; font-size: 1.1rem;">${user.coins}</span>
          </div>
        `;
      });
    }

    Swal.fire({
      html: `
        <div style="text-align: center; margin-bottom: 2rem;">
          <div style="display: inline-block; font-size: 3.5rem; font-weight: 900; color: white; -webkit-text-stroke: 5px transparent; background: linear-gradient(to right, #E6A3D6, #85BCE5); -webkit-background-clip: text; background-clip: text; font-family: 'Arial Black', Gadget, sans-serif; position: relative;">Claw Machine</div>
        </div>
        <div style="background: white; padding: 2.5rem; border-radius: 30px; box-shadow: 0 3px 12px rgba(0, 0, 0, 0.12), 0 1px 6px rgba(0, 0, 0, 0.08); color: #3e3e3e; width: 420px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 1.5rem;">
            <h3 style="margin: 0 0 1rem 0; font-size: 1.5rem; font-weight: bold; color: #3e3e3e;">排行榜</h3>
          </div>
          <div>
            ${leaderboardHTML}
          </div>
        </div>
      `,
      background: 'rgba(255, 255, 255, 0.8)',
      customClass: {
          popup: 'custom-swal-popup',
          confirmButton: 'custom-swal-button-cancel',
          actions: 'custom-swal-actions',
          htmlContainer: 'custom-swal-html-container'
      },
      confirmButtonText: '確定',
      backdrop: true,
      buttonsStyling: false,
      focusConfirm: false,
    });
  };

  useEffect(() => {
    if (axesRef.current) {
      const colors = axesRef.current.geometry.attributes.color;
      const C = 0.5;
      colors.setXYZ(0, 1, C, C);
      colors.setXYZ(1, 1, C, C);
      colors.setXYZ(2, C, 1, C);
      colors.setXYZ(3, C, 1, C);
      colors.setXYZ(4, C, C, 1);
      colors.setXYZ(5, C, C, 1);
      colors.needsUpdate = true;
    }
  }, []);

  return (
    <div className="w-full h-screen relative">
      {isLoggedIn && currentUser && (
        <div className="absolute top-4 left-4" style={{
          zIndex: 9999,
          background: 'white',
          padding: '0.75rem 1rem',
          borderRadius: '20px',
          boxShadow: '0 3px 12px rgba(0, 0, 0, 0.12), 0 1px 6px rgba(0, 0, 0, 0.08)',
          color: '#3e3e3e',
          fontSize: '0.9rem',
          fontWeight: '500',
          minWidth: '180px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ 
              background: 'linear-gradient(to right, #E6A3D6, #85BCE5)',
              borderRadius: '50%',
              width: '35px',
              height: '35px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '1.1rem'
            }}>
              {currentUser.username.charAt(0).toUpperCase()}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>
                {currentUser.username}
              </div>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.4rem',
                background: '#f8f9fa',
                padding: '0.3rem 0.7rem',
                borderRadius: '12px',
                border: '1px solid #e9ecef',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                minWidth: '60px',
                justifyContent: 'center'
              }}>
                <span style={{ 
                  fontSize: '1rem', 
                  color: '#3e3e3e', 
                  fontWeight: 'bold'
                }}>
                  {coins}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="absolute top-4 right-4" style={{
        display: 'flex',
        gap: '0.75rem',
        zIndex: 9999
      }}>
        {/* 排行榜按鈕 - 只在登入後顯示 */}
        {isLoggedIn && currentUser && (
          <button
            onClick={showLeaderboard}
            style={{
              background: 'white',
              border: 'none',
              borderRadius: '50%',
              width: '50px',
              height: '50px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 3px 12px rgba(0, 0, 0, 0.12), 0 1px 6px rgba(0, 0, 0, 0.08)',
              cursor: 'pointer',
              padding: '12px',
              zIndex: 10000,
              position: 'relative'
            }}
          >
            <img src="/trophy.png" alt="排行榜" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </button>
        )}

        {/* 靜音按鈕 */}
        <button
          onClick={() => {
            const newMutedState = !isMuted;
            setIsMuted(newMutedState);
            
            if (bgMusic) {
              if (newMutedState) {
                bgMusic.pause();
              } else {
                bgMusic.play().catch(e => {
                  console.log('音乐播放失败:', e);
                });
              }
            }
            
            console.log('靜音切換:', newMutedState);
          }}
          style={{
            background: 'white',
            border: 'none',
            borderRadius: '50%',
            width: '50px',
            height: '50px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 3px 12px rgba(0, 0, 0, 0.12), 0 1px 6px rgba(0, 0, 0, 0.08)',
            cursor: 'pointer',
            padding: '12px',
            zIndex: 10000,
            position: 'relative'
          }}
        >
          <img 
            src={isMuted ? "/soundoff.png" : "/sound.png"} 
            alt={isMuted ? "靜音" : "音效"} 
            style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
          />
        </button>

        {/* 登出按鈕 - 只在登入後顯示 */}
        {isLoggedIn && currentUser && (
          <button
            onClick={handleLogout}
            style={{
              background: 'white',
              border: 'none',
              borderRadius: '50%',
              width: '50px',
              height: '50px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 3px 12px rgba(0, 0, 0, 0.12), 0 1px 6px rgba(0, 0, 0, 0.08)',
              cursor: 'pointer',
              padding: '12px',
              zIndex: 10000,
              position: 'relative'
            }}
          >
            <img src="/logout.png" alt="登出" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </button>
        )}
      </div>

      {isLoggedIn && (
        <KeyboardControls
          map={[
            { name: "forward", keys: ["ArrowUp", "w", "W"] },
            { name: "backward", keys: ["ArrowDown", "s", "S"] },
            { name: "left", keys: ["ArrowLeft", "a", "A"] },
            { name: "right", keys: ["ArrowRight", "d", "D"] },
            { name: "jump", keys: ["Space"] },
          ]}
        >
          <Canvas gl={{ alpha: true }}>
            <BackgroundImage />
            <ambientLight intensity={Math.PI / 2} />
            <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} decay={0} intensity={Math.PI} />
            <pointLight position={[-10, -10, -10]} decay={0} intensity={Math.PI} />
            
            {!isHidden && (
              <RoundedBox
                args={[1, 1, 1]}
                radius={0.05}
                smoothness={4}
                bevelSegments={4}
                creaseAngle={0.4}
              >
                <meshPhongMaterial color="#f3f3f3"/>
              </RoundedBox>
            )}

            <Box ref={boxRef} args={[0.1, 0.1, 0.1]} position={[0, 0, 0]}>
              <meshPhongMaterial color="#f3f3f3"/>
            </Box>

            <Suspense fallback={null}>
              <ClawModel clawPos={clawPos} isLowering={isLowering} hasPrize={hasPrize} isClawUp={isClawUp} isCoinFlying={isCoinFlying} />
            </Suspense>



            <Environment
              background={false}
              environmentIntensity={1}
              preset={'city'}
            /> 

            <ContactShadows opacity={1} scale={10} blur={10} far={10} resolution={256} color="#DDDDDD" />

            <Camera 
              boxRef={boxRef} 
              clawPos={clawPos} 
              setClawPos={setClawPos} 
              isLowering={isLowering} 
              setIsLowering={setIsLowering}
              hasPrize={hasPrize} 
              setHasPrize={setHasPrize} 
              isClawUp={isClawUp} 
              setIsClawUp={setIsClawUp}
              updateCoins={updateCoins} 
              coins={coins}
              isCoinFlying={isCoinFlying}
              setIsCoinFlying={setIsCoinFlying}
            />
            
            {/* 飞行coin */}
            <FlyingCoin isFlying={isCoinFlying} onComplete={handleCoinFlyComplete} />
            <CameraControls enablePan={false} enableZoom={false} />
            <axesHelper ref={axesRef} args={[10]} />

          </Canvas>
        </KeyboardControls>
      )}
    </div>
  );
}
