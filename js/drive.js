const scope='https://www.googleapis.com/auth/drive.readonly';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
export class DriveClient{
  constructor(clientId){this.clientId=clientId;this.token=null;this.tokenClient=null;}
  async signIn(){
    if(!this.clientId||this.clientId.includes('SUBSTITUA'))throw new Error('Configure googleClientId em config.js.');
    if(!window.google?.accounts?.oauth2)throw new Error('A biblioteca Google Identity Services nao carregou. Verifique rede ou bloqueio de scripts.');
    return new Promise((resolve,reject)=>{
      this.tokenClient=google.accounts.oauth2.initTokenClient({client_id:this.clientId,scope,callback:(response)=>{
        if(response.error){reject(new Error(response.error));return}this.token=response.access_token;resolve(this.token);
      }});
      this.tokenClient.requestAccessToken({prompt:this.token?'':'consent'});
    });
  }
  disconnect(){if(this.token&&window.google?.accounts?.oauth2)google.accounts.oauth2.revoke(this.token,()=>{});this.token=null;}
  async api(endpoint,params={}){
    if(!this.token)throw new Error('Autenticacao necessaria.');
    const url=new URL(`https://www.googleapis.com/drive/v3/${endpoint}`);
    Object.entries(params).forEach(([k,v])=>url.searchParams.set(k,String(v)));
    for(let n=0;n<3;n++){
      const res=await fetch(url,{headers:{Authorization:`Bearer ${this.token}`}});
      if(res.ok)return res.json();
      if([429,500,502,503].includes(res.status)&&n<2){await sleep(400*(2**n));continue;}
      if(res.status===401){this.token=null;throw new Error('Sessao Google expirada. Entre novamente.');}
      let reason='';try{reason=(await res.json()).error?.message||''}catch{}
      throw new Error(`Google Drive respondeu ${res.status}. ${reason}`);
    }
  }
  async children(folderId){
    const all=[];let pageToken='';
    do {
      const r=await this.api('files',{
        q:`'${folderId.replace(/'/g,'')}' in parents and trashed = false`,
        fields:'nextPageToken,files(id,name,mimeType,webViewLink,modifiedTime,size,description)',
        pageSize:1000,orderBy:'name',supportsAllDrives:true,includeItemsFromAllDrives:true,...(pageToken?{pageToken}:{})
      });all.push(...(r.files||[]));pageToken=r.nextPageToken||'';
    } while(pageToken);
    return all;
  }
  async getFolderTree(rootId){
    const root=await this.children(rootId);
    const guias=root.find(f=>f.mimeType==='application/vnd.google-apps.folder'&&/guias de empr[eé]stimo/i.test(f.name));
    const parent=guias?.id||rootId;
    const entries=guias?await this.children(parent):root;
    const years=entries.filter(f=>f.mimeType==='application/vnd.google-apps.folder'&&/^20\d{2}$/.test(f.name)).sort((a,b)=>b.name.localeCompare(a.name));
    return {root,parent,years,other:entries.filter(f=>f.mimeType==='application/vnd.google-apps.folder'&&!/^20\d{2}$/.test(f.name))};
  }
  async folderDocuments(folderId){return (await this.children(folderId)).filter(f=>f.mimeType!=='application/vnd.google-apps.folder');}
  async downloadTextBuffer(fileId){
    if(!this.token)throw new Error('Autenticacao necessaria.');
    const resp=await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,{headers:{Authorization:`Bearer ${this.token}`}});
    if(!resp.ok)throw new Error(`Nao foi possivel ler guia (${resp.status}).`);
    return resp.arrayBuffer();
  }
}
