import React from 'react';
import { runApp, wrapListItem } from '@elements-toolkit/mkworks-cli'
// @ts-ignore
import List from '@elem/list'
// @ts-ignore
import Tabs, { TabPanel } from '@elem/tabs'
// @ts-ignore
import ListImageTop from '@elem/list-image-top'
// @ts-ignore
import ItemImageFirst from '@elem/item-image-rich'
// @ts-ignore
import LinkImageText from '@elem/link-image-text'
// @ts-ignore
import LinkTree from '@elem/link-tree-multi'
// @ts-ignore
import LinkCombineStatistic from '@elem/link-combine-statistic'
import mock from './mock'
import Theme from '../simple'

function App() {
  return (
    <div>
      <div className=""><Theme/></div>
      <div>
        <Tabs defaultActiveKey="1">
          <TabPanel tab="测试1" key="1">
            <List data={mock.ItemImageFirst} itemComponent={wrapListItem(ItemImageFirst, {})} />
            <ListImageTop data={mock.ListImageTop} />
          </TabPanel>
          <TabPanel tab="测试2" key="2">
            <LinkImageText data={mock.LinkImageText}/>
            <LinkCombineStatistic data={mock.LinkCombineStatistic}/>
          </TabPanel>
          <TabPanel tab="测试3" key="3">
            {/* @ts-ignore */}
            <LinkTree data={mock.LinkTree} itemComponent={LinkTree}/>
          </TabPanel>
        </Tabs>
      </div>
    </div>
  );
}

runApp(App)
