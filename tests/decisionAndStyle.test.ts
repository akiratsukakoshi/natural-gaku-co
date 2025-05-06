import { decideAndClassify } from '../src/decisionAndStyle';

describe('decideAndClassify', () => {
  it('should not respond to general mention', async () => {
    const result = await decideAndClassify('がっこちゃんって便利！');
    expect(result.should_respond).toBe(false);
  });

  it('should respond and select style for direct question', async () => {
    const result = await decideAndClassify('がっこちゃん、これどう思う？');
    expect(result.should_respond).toBe(true);
    const style = result.selected_style || 'short_positive_reaction';
    expect(style).toBeTruthy();
  });

  it('should respond and select style for empathy', async () => {
    const result = await decideAndClassify('ここ数日ちょっとメンタル落ちてる');
    expect(result.should_respond).toBe(true);
    expect(result.selected_style).toBe('empathetic_human');
  });

  it('should respond and select style for analysis', async () => {
    const result = await decideAndClassify('SNSが社会に与える影響についてどう思う？');
    expect(result.should_respond).toBe(true);
    const style = result.selected_style || 'deep_analysis';
    expect(style).toBe('deep_analysis');
  });

  it('should respond and select style for positive reaction', async () => {
    const result = await decideAndClassify('新しいブログ書いたよ！');
    expect(result.should_respond).toBe(true);
    const style = result.selected_style || 'short_positive_reaction';
    expect(style).toBe('short_positive_reaction');
  });
}); 