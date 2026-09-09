const fs = require('fs');
const path = 'src/pages/ManageCarousel.tsx';
let code = fs.readFileSync(path, 'utf8');

const oldCode = `        const compressedFile = await imageCompression(selectedFile, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1280,
          useWebWorker: true
        });
        
        const fileRef = ref(storage, \`photo-carousel/\${Date.now()}-\${compressedFile.name}\`);
        const uploadTask = uploadBytesResumable(fileRef, compressedFile);
        
        await new Promise<void>((resolve, reject) => {
          uploadTask.on('state_changed', 
            (snapshot) => {
              setUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            },
            (error) => reject(error),
            async () => {
              imageUrl = await getDownloadURL(uploadTask.snapshot.ref);
              resolve();
            }
          );
        });`;

const newCode = `        console.log("Starting image compression...");
        const compressedFile = await imageCompression(selectedFile, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1280,
          useWebWorker: false
        });
        console.log("Image compressed successfully:", compressedFile);
        
        const fileRef = ref(storage, \`photo-carousel/\${Date.now()}-\${compressedFile.name}\`);
        const uploadTask = uploadBytesResumable(fileRef, compressedFile);
        
        await new Promise<void>((resolve, reject) => {
          uploadTask.on('state_changed', 
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(progress);
              console.log('Upload is ' + progress + '% done');
            },
            (error) => {
              console.error("Firebase upload error:", error);
              reject(error);
            },
            async () => {
              try {
                imageUrl = await getDownloadURL(uploadTask.snapshot.ref);
                console.log("File available at", imageUrl);
                resolve();
              } catch (err) {
                console.error("Error getting download URL:", err);
                reject(err);
              }
            }
          );
        });`;

if (code.includes('useWebWorker: true')) {
  code = code.replace(oldCode, newCode);
  fs.writeFileSync(path, code);
  console.log("Fix applied!");
} else {
  console.log("Could not find the target code.");
}
