// Optional features keep the same AAB installable on phones, tablets and PCs.
export function configurePcManifest(manifest){
 const features=['android.hardware.type.pc','android.hardware.touchscreen','android.hardware.touchscreen.multitouch','android.hardware.touchscreen.multitouch.distinct','android.hardware.faketouch','android.hardware.screen.landscape'];
 for(const name of features){
  const escaped=name.replaceAll('.','\\.');
  manifest=manifest.replace(new RegExp('<uses-feature\\b(?=[^>]*android:name="'+escaped+'")[^>]*(?:\\/>|>\\s*<\\/uses-feature>)','g'),'');
 }
 return manifest.replace('</manifest>',features.map(name=>'    <uses-feature android:name="'+name+'" android:required="false" />').join('\n')+'\n</manifest>');
}
