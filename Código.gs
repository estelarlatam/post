// ============================================
// CONFIGURACIÓN
// ============================================
const CONFIG = {
  SHEET_ID: '1djBa8SxRi-5_HO8OATlVFIFCZvyzAbXdQS2Ox0z4ygc',
  SHEET_NAME: 'Posts',
  IMGBB_API_KEY: '24d1d4cc872344903f2dde9f670f00bc'
};

// ============================================
// WEB APP
// ============================================
function doGet(e) {
  // Template HTML embebido (solución alternativa si no encuentra el archivo)
  const htmlTemplate = HtmlService.createTemplateFromFile('Index');
  
  return htmlTemplate.evaluate()
    .setTitle('Feed Estelar Latam')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ============================================
// FUNCIONES DEL SERVIDOR
// ============================================

function createPost(postData) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
    
    const idPost = 'POST_' + new Date().getTime();
    const timestamp = new Date();
    
    // Subir a ImgBB si viene base64
    let imageUrl = postData.imagen_url || '';
    if (postData.imagen_base64) {
      const uploadResult = uploadToImgBB(postData.imagen_base64, idPost);
      if (uploadResult.success) {
        imageUrl = uploadResult.url;
      } else {
        return { success: false, error: uploadResult.error };
      }
    }
    
    sheet.appendRow([
      idPost,
      timestamp,
      postData.username || 'Anónimo',
      postData.avatar_url || '',
      imageUrl,
      postData.caption || '',
      postData.hashtags || '',
      0,
      0,
      'Activo'
    ]);
    
    return { success: true, id: idPost, image_url: imageUrl };
    
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function uploadToImgBB(base64Image, name) {
  try {
    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');
    
    const response = UrlFetchApp.fetch('https://api.imgbb.com/1/upload', {
      method: 'post',
      payload: {
        key: CONFIG.IMGBB_API_KEY,
        image: cleanBase64,
        name: name
      }
    });
    
    const result = JSON.parse(response.getContentText());
    
    if (result.success) {
      return { success: true, url: result.data.url };
    } else {
      return { success: false, error: 'Error ImgBB' };
    }
    
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function getFeed(limit, offset) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return { success: true, posts: [] };
    }
    
    const posts = [];
    const rows = data.slice(1).reverse();
    
    for (let i = offset || 0; i < rows.length && posts.length < (limit || 50); i++) {
      const row = rows[i];
      if (row[0] && row[9] === 'Activo') {
        posts.push({
          id: row[0],
          timestamp: row[1],
          username: row[2],
          avatar_url: row[3],
          imagen_url: row[4],
          caption: row[5],
          hashtags: row[6],
          likes: row[7] || 0,
          comentarios: row[8] || 0
        });
      }
    }
    
    return { success: true, posts: posts };
    
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function likePost(idPost) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === idPost) {
        const newLikes = (parseInt(data[i][7]) || 0) + 1;
        sheet.getRange(i + 1, 8).setValue(newLikes);
        return { success: true, likes: newLikes };
      }
    }
    
    return { success: false, error: 'Post no encontrado' };
    
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}
