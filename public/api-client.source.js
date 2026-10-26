(function(){
 let client;
 window.campusApiFetch=async function(route,options={}){
   try{
     client??=import('./static-client.mjs').then(module=>module.createPagesClient({readConfig:()=>window.CAMPUS_DEPLOY||{},readPreferences:()=>window.CampusApiPreferences,location:window.location}));
     return await(await client)(route,options);
   }catch{
     client=null;
     return Response.json({error:'聊天模块未能加载，请刷新页面重试。'},{status:503,headers:{'Cache-Control':'no-store'}});
   }
 };
})();
