
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
  }).format(amount);
};

export const formatDate = (dateStr: string): string => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * แปลง URL ให้เป็นลิงก์ที่สามารถแสดงผลในแท็ก <img> ได้
 * โดยเฉพาะลิงก์จาก Google Drive
 */
export const getPreviewUrl = (url?: string): string => {
  if (!url) return '';
  if (url.startsWith('data:image')) return url;
  
  // ค้นหา File ID จากลิงก์ Google Drive
  const driveMatch = url.match(/[-\w]{25,}/);
  if (url.includes('drive.google.com') && driveMatch) {
    // ใช้รูปแบบ lh3.googleusercontent.com เพื่อให้เบราว์เซอร์แสดงผลรูปได้โดยตรง
    return `https://lh3.googleusercontent.com/d/${driveMatch[0]}`;
  }
  
  return url;
};

export const compressImage = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Simple proportional scaling if too large
        const MAX_SIZE = 1200;
        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        // Quality set to 0.7 to aim for < 1MB
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        resolve(dataUrl);
      };
    };
    reader.onerror = (error) => reject(error);
  });
};
